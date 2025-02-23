import { z } from 'zod';
import type { Recipe, CookingSkillLevel, CuisineType, DietaryRestriction } from './types';

const SPOONACULAR_API_KEY = 'YOUR_API_KEY'; // Replace with your API key
const BASE_URL = 'https://api.spoonacular.com/recipes';

const SpoonacularRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string(),
  image: z.string(),
  readyInMinutes: z.number(),
  servings: z.number(),
  healthScore: z.number(),
  spoonacularScore: z.number(),
  pricePerServing: z.number(),
  vegetarian: z.boolean(),
  vegan: z.boolean(),
  glutenFree: z.boolean(),
  dairyFree: z.boolean(),
  veryHealthy: z.boolean(),
  cheap: z.boolean(),
  veryPopular: z.boolean(),
  sustainable: z.boolean(),
  analyzedInstructions: z.array(z.object({
    steps: z.array(z.object({
      number: z.number(),
      step: z.string(),
      ingredients: z.array(z.object({
        id: z.number(),
        name: z.string(),
      })),
      equipment: z.array(z.object({
        id: z.number(),
        name: z.string(),
      })),
    })),
  })).optional(),
  extendedIngredients: z.array(z.object({
    id: z.number(),
    name: z.string(),
    amount: z.number(),
    unit: z.string(),
  })),
  cuisines: z.array(z.string()).optional(),
  dishTypes: z.array(z.string()).optional(),
  diets: z.array(z.string()).optional(),
});

type SpoonacularRecipe = z.infer<typeof SpoonacularRecipeSchema>;

function mapDifficulty(recipe: SpoonacularRecipe): CookingSkillLevel {
  const { readyInMinutes, analyzedInstructions } = recipe;
  const steps = analyzedInstructions?.[0]?.steps?.length || 0;
  
  if (readyInMinutes <= 20 && steps <= 5) return 'beginner';
  if (readyInMinutes <= 45 && steps <= 10) return 'intermediate';
  return 'advanced';
}

function mapCuisineType(cuisines: string[] = []): CuisineType {
  const cuisineMap: Record<string, CuisineType> = {
    'american': 'american',
    'italian': 'italian',
    'mexican': 'mexican',
    'asian': 'asian',
    'chinese': 'asian',
    'japanese': 'asian',
    'korean': 'asian',
    'thai': 'asian',
    'vietnamese': 'asian',
    'mediterranean': 'mediterranean',
    'middle eastern': 'mediterranean',
    'greek': 'mediterranean',
    'indian': 'indian',
    'french': 'french',
  };

  for (const cuisine of cuisines) {
    const normalized = cuisine.toLowerCase();
    if (normalized in cuisineMap) {
      return cuisineMap[normalized];
    }
  }
  
  return 'other';
}

function mapDietaryRestrictions(recipe: SpoonacularRecipe): DietaryRestriction[] {
  const restrictions: DietaryRestriction[] = [];

  if (recipe.vegetarian) restrictions.push('vegetarian');
  if (recipe.vegan) restrictions.push('vegan');
  if (recipe.glutenFree) restrictions.push('gluten-free');
  if (recipe.dairyFree) restrictions.push('dairy-free');
  if (recipe.healthScore >= 80) restrictions.push('low-carb');

  return restrictions;
}

function transformSpoonacularRecipe(recipe: SpoonacularRecipe): Recipe {
  const difficulty = mapDifficulty(recipe);
  const cuisineType = mapCuisineType(recipe.cuisines);
  const dietaryRestrictions = mapDietaryRestrictions(recipe);

  return {
    id: recipe.id.toString(),
    title: recipe.title,
    description: recipe.summary.replace(/<[^>]*>/g, '').slice(0, 200) + '...',
    ingredients: recipe.extendedIngredients.map(i => `${i.amount} ${i.unit} ${i.name}`),
    instructions: recipe.analyzedInstructions?.[0]?.steps?.map(s => s.step) || [],
    cookingTime: recipe.readyInMinutes,
    servings: recipe.servings,
    difficulty,
    cuisineType,
    dietaryRestrictions,
    calories: Math.round(recipe.healthScore * 5), // Approximate calories
    rating: recipe.spoonacularScore / 20, // Convert to 5-star scale
    imageUrl: recipe.image,
    equipment: recipe.analyzedInstructions?.[0]?.steps
      ?.flatMap(s => s.equipment)
      .filter((e, i, a) => a.findIndex(x => x.id === e.id) === i)
      .map(e => e.name) || [],
  };
}

export async function searchRecipes(query: string, filters: Partial<{
  cuisine: string;
  diet: string;
  maxReadyTime: number;
  minCalories: number;
  maxCalories: number;
  number: number;
  offset: number;
}> = {}): Promise<Recipe[]> {
  try {
    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      query,
      addRecipeInformation: 'true',
      fillIngredients: 'true',
      instructionsRequired: 'true',
      ...filters,
      number: String(filters.number || 12),
    });

    const response = await fetch(`${BASE_URL}/complexSearch?${params}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const recipes = await Promise.all(
      data.results.map(async (result: any) => {
        try {
          const recipe = SpoonacularRecipeSchema.parse(result);
          return transformSpoonacularRecipe(recipe);
        } catch (error) {
          console.error('Error parsing recipe:', error);
          return null;
        }
      })
    );

    return recipes.filter((r): r is Recipe => r !== null);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
}

export async function getRandomRecipes(filters: Partial<{
  tags: string[];
  number: number;
}> = {}): Promise<Recipe[]> {
  try {
    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      number: String(filters.number || 12),
      tags: filters.tags?.join(',') || '',
      addRecipeInformation: 'true',
      fillIngredients: 'true',
      instructionsRequired: 'true',
    });

    const response = await fetch(`${BASE_URL}/random?${params}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const recipes = await Promise.all(
      data.recipes.map(async (result: any) => {
        try {
          const recipe = SpoonacularRecipeSchema.parse(result);
          return transformSpoonacularRecipe(recipe);
        } catch (error) {
          console.error('Error parsing recipe:', error);
          return null;
        }
      })
    );

    return recipes.filter((r): r is Recipe => r !== null);
  } catch (error) {
    console.error('Error fetching random recipes:', error);
    throw error;
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      addRecipeInformation: 'true',
      fillIngredients: 'true',
    });

    const response = await fetch(`${BASE_URL}/${id}/information?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const recipe = SpoonacularRecipeSchema.parse(data);
    return transformSpoonacularRecipe(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    throw error;
  }
}

export async function getRecipesByIngredients(ingredients: string[], filters: Partial<{
  number: number;
  ranking: 1 | 2; // 1 = maximize used ingredients, 2 = minimize missing ingredients
  ignorePantry: boolean;
}> = {}): Promise<Recipe[]> {
  try {
    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      ingredients: ingredients.join(','),
      number: String(filters.number || 12),
      ranking: String(filters.ranking || 2),
      ignorePantry: String(filters.ignorePantry || true),
      addRecipeInformation: 'true',
      fillIngredients: 'true',
    });

    const response = await fetch(`${BASE_URL}/findByIngredients?${params}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const recipeIds = data.map((r: any) => r.id);

    // Fetch full recipe information for each recipe
    const recipes = await Promise.all(
      recipeIds.map(id => getRecipeById(String(id)))
    );

    return recipes.filter((r): r is Recipe => r !== null);
  } catch (error) {
    console.error('Error fetching recipes by ingredients:', error);
    throw error;
  }
}