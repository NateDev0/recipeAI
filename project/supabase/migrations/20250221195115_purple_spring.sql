/*
  # Fix RLS Policies and Profile Creation

  1. Changes
    - Temporarily drop foreign key constraint from food_items
    - Recreate profiles table with proper structure
    - Restore foreign key constraint
    - Update RLS policies for both tables
    - Add performance indexes

  2. Security
    - Enable RLS on all tables
    - Add proper policies for authenticated users
    - Ensure users can only access their own data
*/

-- First, drop the foreign key constraint
ALTER TABLE food_items
DROP CONSTRAINT IF EXISTS food_items_user_id_fkey;

-- Recreate profiles table with proper structure
CREATE TABLE IF NOT EXISTS new_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Copy data if old table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    INSERT INTO new_profiles (id, email, created_at, updated_at)
    SELECT id, email, created_at, updated_at FROM profiles;
  END IF;
END $$;

-- Drop old profiles table
DROP TABLE IF EXISTS profiles;

-- Rename new table to profiles
ALTER TABLE IF EXISTS new_profiles RENAME TO profiles;

-- Restore foreign key constraint
ALTER TABLE food_items
ADD CONSTRAINT food_items_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Enable read access for own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable insert access for own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update access for own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix food_items policies
DROP POLICY IF EXISTS "Users can view own food items" ON food_items;
DROP POLICY IF EXISTS "Users can create food items" ON food_items;
DROP POLICY IF EXISTS "Users can update own food items" ON food_items;
DROP POLICY IF EXISTS "Users can delete own food items" ON food_items;

CREATE POLICY "Enable read access for own food items"
  ON food_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for own food items"
  ON food_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for own food items"
  ON food_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for own food items"
  ON food_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create or replace function for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers exist
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON food_items;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON food_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_food_items_user_id ON food_items(user_id);
CREATE INDEX IF NOT EXISTS idx_food_items_expiration_date ON food_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category);