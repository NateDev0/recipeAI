/*
  # Add Recipes Table and Update Food Items

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `ingredients` (jsonb array)
      - `instructions` (text array)
      - `cooking_time` (integer)
      - `servings` (integer)
      - `difficulty` (text)
      - `cuisine_type` (text)
      - `dietary_restrictions` (text array)
      - `calories` (integer)
      - `rating` (numeric)
      - `image_url` (text)
      - `equipment` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `recipes` table
    - Add policies for authenticated users to read all recipes
*/

-- Create recipes table
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  ingredients jsonb[] NOT NULL,
  instructions text[] NOT NULL,
  cooking_time integer NOT NULL,
  servings integer NOT NULL,
  difficulty text NOT NULL,
  cuisine_type text NOT NULL,
  dietary_restrictions text[] NOT NULL DEFAULT '{}',
  calories integer NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  image_url text,
  equipment text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all authenticated users"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_cuisine_type ON recipes(cuisine_type);
CREATE INDEX idx_recipes_cooking_time ON recipes(cooking_time);
CREATE INDEX idx_recipes_rating ON recipes(rating);