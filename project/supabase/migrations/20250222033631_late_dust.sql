/*
  # Add food quantity tracking and recipe usage

  1. Changes
    - Add `initial_quantity` to track starting amount
    - Add `current_quantity` to track remaining amount
    - Add `used_in_recipes` array to track recipe usage
    - Add trigger to update quantities when used in recipes

  2. Security
    - Maintain existing RLS policies
    - Add policies for quantity updates
*/

-- Add new columns to food_items
ALTER TABLE food_items 
ADD COLUMN initial_quantity numeric NOT NULL DEFAULT 1,
ADD COLUMN current_quantity numeric NOT NULL DEFAULT 1,
ADD COLUMN used_in_recipes jsonb[] DEFAULT ARRAY[]::jsonb[];

-- Create function to validate quantity
CREATE OR REPLACE FUNCTION validate_food_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure current_quantity doesn't exceed initial_quantity
  IF NEW.current_quantity > NEW.initial_quantity THEN
    RAISE EXCEPTION 'Current quantity cannot exceed initial quantity';
  END IF;
  
  -- Ensure quantities are not negative
  IF NEW.current_quantity < 0 OR NEW.initial_quantity < 0 THEN
    RAISE EXCEPTION 'Quantities cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quantity validation
CREATE TRIGGER check_food_quantity
  BEFORE INSERT OR UPDATE ON food_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_food_quantity();

-- Function to update food quantities when used in recipes
CREATE OR REPLACE FUNCTION update_food_quantity_on_recipe_use()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_quantity based on recipe usage
  NEW.current_quantity = NEW.initial_quantity - (
    SELECT COALESCE(SUM((value->>'amount')::numeric), 0)
    FROM unnest(NEW.used_in_recipes) AS value
  );
  
  -- Validate the new quantity
  IF NEW.current_quantity < 0 THEN
    RAISE EXCEPTION 'Not enough quantity available for recipe';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recipe usage updates
CREATE TRIGGER update_food_quantity
  BEFORE UPDATE OF used_in_recipes ON food_items
  FOR EACH ROW
  EXECUTE FUNCTION update_food_quantity_on_recipe_use();

-- Update existing rows to set initial and current quantities
UPDATE food_items 
SET 
  initial_quantity = quantity,
  current_quantity = quantity
WHERE initial_quantity IS NULL OR current_quantity IS NULL;