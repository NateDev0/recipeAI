/*
  # Fix recipes table structure

  1. Changes
    - Drop and recreate recipes table with proper structure
    - Add proper indexes and constraints
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS recipes;

-- Create recipes table with proper structure
CREATE TABLE recipes (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  ingredients text[] NOT NULL,
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

CREATE POLICY "Enable insert access for all authenticated users"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);

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