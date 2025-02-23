import { z } from 'zod';
import type { Recipe, CookingSkillLevel, CuisineType, DietaryRestriction } from './types';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Sample recipes for when API fails or returns no results
const SAMPLE_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Classic Spaghetti and Meatballs',
    description: 'A hearty Italian pasta dish with homemade meatballs in a rich tomato sauce',
    ingredients: [
      '1 pound ground beef',
      '1 pound spaghetti',
      '2 cups tomato sauce',
      '1 onion',
      '3 cloves garlic',
      '1/2 cup breadcrumbs',
      '1/4 cup parmesan cheese',
      '2 eggs',
      'Salt and pepper to taste',
      'Olive oil'
    ],
    instructions: [
      'Mix ground beef with breadcrumbs, eggs, and seasonings',
      'Form into meatballs and brown in olive oil',
      'Cook spaghetti according to package instructions',
      'Simmer meatballs in tomato sauce',
      'Serve pasta topped with meatballs and sauce',
      'Garnish with fresh parmesan'
    ],
    cookingTime: 45,
    servings: 4,
    difficulty: 'intermediate',
    cuisineType: 'italian',
    dietaryRestrictions: [],
    calories: 650,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?auto=format&fit=crop&w=1200&q=80',
    equipment: ['Large pot', 'Frying pan', 'Mixing bowls']
  },
  {
    id: '2',
    title: 'Quick Chicken Stir-Fry',
    description: 'A colorful and healthy stir-fry with tender chicken and crisp vegetables',
    ingredients: [
      '2 chicken breasts',
      '2 cups mixed vegetables',
      '1 cup rice',
      '3 tablespoons soy sauce',
      '2 cloves garlic',
      '1 inch ginger',
      'Vegetable oil',
      'Salt and pepper'
    ],
    instructions: [
      'Cook rice according to package instructions',
      'Cut chicken into bite-sized pieces',
      'Stir-fry chicken until golden',
      'Add vegetables and stir-fry until crisp-tender',
      'Add sauce and simmer briefly',
      'Serve over hot rice'
    ],
    cookingTime: 30,
    servings: 4,
    difficulty: 'beginner',
    cuisineType: 'asian',
    dietaryRestrictions: [],
    calories: 450,
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80',
    equipment: ['Wok or large pan', 'Rice cooker', 'Cutting board']
  },
  {
    id: '3',
    title: 'Vegetarian Buddha Bowl',
    description: 'A nourishing bowl packed with grains, roasted vegetables, and tahini dressing',
    ingredients: [
      '1 cup quinoa',
      '2 sweet potatoes',
      '1 can chickpeas',
      '2 cups kale',
      '1 avocado',
      '1/4 cup tahini',
      'Lemon juice',
      'Olive oil',
      'Salt and pepper'
    ],
    instructions: [
      'Cook quinoa according to package instructions',
      'Roast sweet potatoes and chickpeas',
      'Massage kale with olive oil',
      'Make tahini dressing',
      'Assemble bowls with all components',
      'Top with sliced avocado'
    ],
    cookingTime: 40,
    servings: 4,
    difficulty: 'beginner',
    cuisineType: 'mediterranean',
    dietaryRestrictions: ['vegetarian', 'vegan', 'gluten-free'],
    calories: 550,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1543340713-1bf56d3d1b68?auto=format&fit=crop&w=1200&q=80',
    equipment: ['Baking sheet', 'Saucepan', 'Mixing bowls']
  }
];

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 100,
  timeWindow: 60 * 60 * 1000,
  requests: [] as number[],
};

function checkRateLimit(): { allowed: boolean; resetTime: number | null } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.timeWindow;
  
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => time > windowStart);
  
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
    const oldestRequest = Math.min(...RATE_LIMIT.requests);
    const resetTime = oldestRequest + RATE_LIMIT.timeWindow;
    return { allowed: false, resetTime };
  }

  RATE_LIMIT.requests.push(now);
  return { allowed: true, resetTime: null };
}

function formatResetTime(resetTime: number): string {
  const minutes = Math.ceil((resetTime - Date.now()) / (60 * 1000));
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

const MealDBRecipeSchema = z.object({
  idMeal: z.string(),
  strMeal: z.string(),
  strCategory: z.string().optional().nullable(),
  strArea: z.string().optional().nullable(),
  strInstructions: z.string(),
  strMealThumb: z.string().optional().nullable(),
  strTags: z.string().optional().nullable(),
  strYoutube: z.string().optional().nullable(),
  strSource: z.string().optional().nullable(),
}).catchall(z.unknown());

function mapDifficulty(recipe: z.infer<typeof MealDBRecipeSchema>): CookingSkillLevel {
  try {
    const instructions = recipe.strInstructions.split('\n').filter(Boolean);
    const ingredients = Object.entries(recipe)
      .filter(([key, value]) => key.startsWith('strIngredient') && value && typeof value === 'string' && value.trim())
      .length;
    
    if (instructions.length <= 5 && ingredients <= 6) return 'beginner';
    if (instructions.length <= 10 && ingredients <= 10) return 'intermediate';
    return 'advanced';
  } catch (error) {
    console.error('Error mapping difficulty:', error);
    return 'intermediate';
  }
}

function mapCuisineType(area: string | null | undefined): CuisineType {
  if (!area) return 'other';

  const areaMap: Record<string, CuisineType> = {
    'American': 'american',
    'Italian': 'italian',
    'Mexican': 'mexican',
    'Chinese': 'asian',
    'Japanese': 'asian',
    'Korean': 'asian',
    'Thai': 'asian',
    'Vietnamese': 'asian',
    'Indian': 'indian',
    'French': 'french',
    'Greek': 'mediterranean',
    'Turkish': 'mediterranean',
    'Moroccan': 'mediterranean',
  };

  return areaMap[area] || 'other';
}

function mapDietaryRestrictions(recipe: z.infer<typeof MealDBRecipeSchema>): DietaryRestriction[] {
  try {
    const restrictions: DietaryRestriction[] = [];
    const tags = recipe.strTags?.toLowerCase().split(',') || [];
    const ingredients = Object.entries(recipe)
      .filter(([key, value]) => key.startsWith('strIngredient') && value && typeof value === 'string' && value.trim())
      .map(([_, value]) => (value as string).toLowerCase());

    // Check for vegetarian
    const meatIngredients = ['chicken', 'beef', 'pork', 'fish', 'meat', 'lamb'];
    if (!ingredients.some(i => meatIngredients.some(m => i.includes(m)))) {
      restrictions.push('vegetarian');
    }

    // Check for vegan
    const veganExclusions = ['milk', 'cream', 'cheese', 'egg', 'honey', 'butter'];
    if (restrictions.includes('vegetarian') && 
        !ingredients.some(i => veganExclusions.some(v => i.includes(v)))) {
      restrictions.push('vegan');
    }

    // Check for gluten-free
    const glutenIngredients = ['flour', 'bread', 'pasta', 'wheat'];
    if (!ingredients.some(i => glutenIngredients.some(g => i.includes(g)))) {
      restrictions.push('gluten-free');
    }

    // Check for dairy-free
    const dairyIngredients = ['milk', 'cream', 'cheese', 'butter', 'yogurt'];
    if (!ingredients.some(i => dairyIngredients.some(d => i.includes(d)))) {
      restrictions.push('dairy-free');
    }

    // Add tags-based restrictions
    if (tags.includes('low-carb')) restrictions.push('low-carb');
    if (tags.includes('keto')) restrictions.push('keto');
    if (tags.includes('paleo')) restrictions.push('paleo');

    return restrictions;
  } catch (error) {
    console.error('Error mapping dietary restrictions:', error);
    return [];
  }
}

function getIngredients(recipe: z.infer<typeof MealDBRecipeSchema>): string[] {
  try {
    const ingredients: string[] = [];
    
    for (let i = 1; i <= 20; i++) {
      const ingredient = (recipe as any)[`strIngredient${i}`];
      const measure = (recipe as any)[`strMeasure${i}`];
      
      if (ingredient && measure && 
          typeof ingredient === 'string' && typeof measure === 'string' &&
          ingredient.trim() && measure.trim()) {
        ingredients.push(`${measure.trim()} ${ingredient.trim()}`);
      }
    }

    return ingredients;
  } catch (error) {
    console.error('Error getting ingredients:', error);
    return [];
  }
}

function transformMealDBRecipe(recipe: z.infer<typeof MealDBRecipeSchema>): Recipe | null {
  try {
    const difficulty = mapDifficulty(recipe);
    const cuisineType = mapCuisineType(recipe.strArea);
    const dietaryRestrictions = mapDietaryRestrictions(recipe);
    const ingredients = getIngredients(recipe);
    const instructions = recipe.strInstructions
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (!recipe.strMeal || !recipe.strInstructions || ingredients.length === 0) {
      console.error('Invalid recipe data:', recipe);
      return null;
    }

    return {
      id: recipe.idMeal,
      title: recipe.strMeal,
      description: instructions[0] || recipe.strMeal,
      ingredients,
      instructions,
      cookingTime: Math.round((instructions.length * 5) + 10),
      servings: 4,
      difficulty,
      cuisineType,
      dietaryRestrictions,
      calories: 0,
      rating: 4.5,
      imageUrl: recipe.strMealThumb || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352',
      equipment: [],
    };
  } catch (error) {
    console.error('Error transforming recipe:', error);
    return null;
  }
}

async function makeRequest(url: string): Promise<any> {
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed && rateLimit.resetTime) {
    const waitTime = formatResetTime(rateLimit.resetTime);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} before trying again.`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  return response.json();
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  try {
    const data = await makeRequest(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
    
    if (!data.meals) {
      // Return sample recipes if no results found
      return SAMPLE_RECIPES.filter(recipe =>
        recipe.ingredients.some(ingredient =>
          query.toLowerCase().split(',').some(term =>
            ingredient.toLowerCase().includes(term.trim())
          )
        )
      );
    }

    const recipes = await Promise.all(data.meals.map(async (meal: any) => {
      try {
        const recipe = await MealDBRecipeSchema.parseAsync(meal);
        return transformMealDBRecipe(recipe);
      } catch (error) {
        console.error('Error parsing recipe:', error);
        return null;
      }
    }));

    const validRecipes = recipes.filter((r): r is Recipe => r !== null);
    return validRecipes.length > 0 ? validRecipes : SAMPLE_RECIPES;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return SAMPLE_RECIPES;
  }
}

export async function getRandomRecipes(): Promise<Recipe[]> {
  try {
    const recipes: Recipe[] = [];
    const seen = new Set<string>();

    // Fetch multiple random recipes
    for (let i = 0; i < 10; i++) {
      try {
        const data = await makeRequest(`${BASE_URL}/random.php`);
        if (!data.meals?.[0]) continue;

        const recipe = await MealDBRecipeSchema.parseAsync(data.meals[0]);
        const transformed = transformMealDBRecipe(recipe);
        
        if (!transformed) continue;
        
        // Skip duplicates
        if (seen.has(transformed.id)) continue;
        seen.add(transformed.id);

        recipes.push(transformed);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
          throw error;
        }
        console.error('Error parsing recipe:', error);
      }
    }

    return recipes.length > 0 ? recipes : SAMPLE_RECIPES;
  } catch (error) {
    console.error('Error fetching random recipes:', error);
    return SAMPLE_RECIPES;
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const data = await makeRequest(`${BASE_URL}/lookup.php?i=${id}`);
    if (!data.meals?.[0]) {
      const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === id);
      return sampleRecipe || null;
    }

    try {
      const recipe = await MealDBRecipeSchema.parseAsync(data.meals[0]);
      return transformMealDBRecipe(recipe);
    } catch (error) {
      console.error('Error parsing recipe:', error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return SAMPLE_RECIPES.find(r => r.id === id) || null;
  }
}

export async function getRecipesByCategory(category: string): Promise<Recipe[]> {
  try {
    const data = await makeRequest(`${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`);
    if (!data.meals) return SAMPLE_RECIPES;

    // Fetch full recipe details for each meal
    const recipes = await Promise.all(
      data.meals.map((meal: any) => getRecipeById(meal.idMeal))
    );

    const validRecipes = recipes.filter((r): r is Recipe => r !== null);
    return validRecipes.length > 0 ? validRecipes : SAMPLE_RECIPES;
  } catch (error) {
    console.error('Error fetching recipes by category:', error);
    return SAMPLE_RECIPES;
  }
}

export async function getRecipesByArea(area: string): Promise<Recipe[]> {
  try {
    const data = await makeRequest(`${BASE_URL}/filter.php?a=${encodeURIComponent(area)}`);
    if (!data.meals) return SAMPLE_RECIPES;

    // Fetch full recipe details for each meal
    const recipes = await Promise.all(
      data.meals.map((meal: any) => getRecipeById(meal.idMeal))
    );

    const validRecipes = recipes.filter((r): r is Recipe => r !== null);
    return validRecipes.length > 0 ? validRecipes : SAMPLE_RECIPES;
  } catch (error) {
    console.error('Error fetching recipes by area:', error);
    return SAMPLE_RECIPES;
  }
}