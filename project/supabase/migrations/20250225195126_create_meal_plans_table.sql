-- Create meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  breakfast_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  lunch_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  dinner_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_days INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Composite unique constraint for user and date
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Create RLS policies
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own meal plans
CREATE POLICY "Users can view their own meal plans" 
  ON meal_plans 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own meal plans
CREATE POLICY "Users can create their own meal plans" 
  ON meal_plans 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own meal plans
CREATE POLICY "Users can update their own meal plans" 
  ON meal_plans 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow users to delete their own meal plans
CREATE POLICY "Users can delete their own meal plans" 
  ON meal_plans 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER set_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create index for faster queries
CREATE INDEX meal_plans_user_id_idx ON meal_plans (user_id);
CREATE INDEX meal_plans_date_idx ON meal_plans (date);
CREATE INDEX meal_plans_recurring_idx ON meal_plans (is_recurring) WHERE is_recurring = true;
