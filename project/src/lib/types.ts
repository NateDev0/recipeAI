export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  initial_quantity: number;
  current_quantity: number;
  used_in_recipes: Array<{
    recipe_id: string;
    recipe_name: string;
    amount: number;
    date: string;
  }>;
  unit: string;
  category: string;
  expiration_date: string | null;
  storage_location: string;
  created_at: string;
  updated_at: string;
}

export interface FoodItemInput {
  name: string;
  quantity: number;
  initial_quantity: number;
  current_quantity: number;
  unit: string;
  category: string;
  expiration_date: string | null;
  storage_location: string;
}

export type Category = 
  | 'Produce'
  | 'Dairy'
  | 'Meat'
  | 'Pantry'
  | 'Frozen'
  | 'Beverages'
  | 'Snacks'
  | 'Spices'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Produce',
  'Dairy',
  'Meat',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Spices',
  'Other',
];

export const UNITS = [
  'pieces',
  'grams',
  'kilograms',
  'milliliters',
  'liters',
  'cups',
  'tablespoons',
  'teaspoons',
  'ounces',
  'pounds',
] as const;

export type Unit = typeof UNITS[number];

export type CookingSkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type DietaryPreset = 
  | 'teen-friendly'
  | 'dad-bod-comfort'
  | 'health-nut'
  | 'budget-chef'
  | 'time-saver';

export type CuisineType =
  | 'american'
  | 'italian'
  | 'mexican'
  | 'asian'
  | 'mediterranean'
  | 'indian'
  | 'french'
  | 'other';

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'low-carb'
  | 'keto'
  | 'paleo';

export interface RecipeFilters {
  ingredients: string[];
  skillLevel: CookingSkillLevel;
  dietaryPreset?: DietaryPreset;
  cookingTime?: number;
  cuisineType?: CuisineType;
  dietaryRestrictions: DietaryRestriction[];
  calorieRange?: {
    min: number;
    max: number;
  };
  servings?: number;
  maxIngredients?: number;
  sortBy?: 'time' | 'difficulty' | 'rating' | 'ingredients';
  sortOrder?: 'asc' | 'desc';
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookingTime: number;
  servings: number;
  difficulty: CookingSkillLevel;
  cuisineType: CuisineType;
  dietaryRestrictions: DietaryRestriction[];
  calories: number;
  rating: number;
  imageUrl: string;
  equipment: string[];
}