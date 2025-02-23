/*
  # Recipe Tracking System

  1. New Tables
    - `saved_recipes`
      - Links users to their saved recipes
      - Tracks cooking history and ratings
    - `recipe_ingredients`
      - Maps recipe ingredients to pantry items
      - Helps with ingredient matching

  2. Changes
    - Add tracking for recipe usage and ratings
    - Add ingredient mapping for better suggestions

  3. Security
    - Enable RLS on new tables
    - Add policies for user access
*/

-- Create saved_recipes table
CREATE TABLE saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id text REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  times_cooked integer DEFAULT 0,
  last_cooked timestamptz,
  user_rating numeric CHECK (user_rating >= 0 AND user_rating <= 5),
  notes text,
  favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Create recipe_ingredients table for better ingredient matching
CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id text REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_name text NOT NULL,
  normalized_name text NOT NULL,
  required_amount numeric,
  unit text,
  substitutes text[] DEFAULT '{}',
  optional boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_recipes
CREATE POLICY "Users can view own saved recipes"
  ON saved_recipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save recipes"
  ON saved_recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved recipes"
  ON saved_recipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved recipes"
  ON saved_recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for recipe_ingredients
CREATE POLICY "Anyone can view recipe ingredients"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_saved_recipes_user ON saved_recipes(user_id);
CREATE INDEX idx_saved_recipes_recipe ON saved_recipes(recipe_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_name ON recipe_ingredients(normalized_name);

-- Create function to normalize ingredient names
CREATE OR REPLACE FUNCTION normalize_ingredient_name(ingredient text)
RETURNS text AS $$
BEGIN
  RETURN lower(regexp_replace(ingredient, '[^a-zA-Z0-9]+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to find matching pantry items
CREATE OR REPLACE FUNCTION find_matching_pantry_items(recipe_id text, user_id uuid)
RETURNS TABLE (
  ingredient_name text,
  pantry_item_id uuid,
  available_quantity numeric,
  required_amount numeric,
  unit text,
  substitutes_available boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH recipe_reqs AS (
    SELECT 
      ri.ingredient_name,
      ri.required_amount,
      ri.unit,
      ri.normalized_name,
      ri.substitutes
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = $1
  )
  SELECT 
    rr.ingredient_name,
    fi.id as pantry_item_id,
    fi.current_quantity as available_quantity,
    rr.required_amount,
    rr.unit,
    EXISTS (
      SELECT 1 
      FROM unnest(rr.substitutes) sub
      WHERE EXISTS (
        SELECT 1 
        FROM food_items fi2 
        WHERE fi2.user_id = $2 
        AND normalize_ingredient_name(fi2.name) = normalize_ingredient_name(sub)
        AND fi2.current_quantity > 0
      )
    ) as substitutes_available
  FROM recipe_reqs rr
  LEFT JOIN food_items fi ON 
    fi.user_id = $2 
    AND normalize_ingredient_name(fi.name) = rr.normalized_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;