import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recipe, CookingSkillLevel, CuisineType, DietaryRestriction } from './types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    item: string;
    amount: string;
    unit: string;
  }>;
  instructions: string[];
  cookTime: string;
  servings: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  cuisine: string;
  imageDescription: string;
}

// Add this cache at the top of the file, outside of any functions
const imageUrlCache = new Map<string, string>();

// Make individual Apify API calls in parallel instead of batching
async function fetchSingleRecipeImage(title: string): Promise<string> {
  try {
    const searchQuery = title.trim() + " food recipe dish prepared";
    console.log(`Starting image search for: "${searchQuery}"`);
    
    const apiToken = "apify_api_xk7oUj8gGRaZfScOCNs0o9AMZ4iFgd2CKV9B";
    const apiUrl = `https://api.apify.com/v2/acts/hooli~google-images-scraper/run-sync-get-dataset-items?token=${apiToken}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries: [searchQuery],
        maxResultsPerQuery: 1
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.length > 0) {
        const imageItem = data.find((item: { imageUrl?: string }) => item && item.imageUrl);
        if (imageItem && imageItem.imageUrl) {
          console.log(`Found image for "${title}": ${imageItem.imageUrl}`);
          // Cache the result for future use
          imageUrlCache.set(title, imageItem.imageUrl);
          return imageItem.imageUrl;
        }
      }
    } else {
      console.error(`Apify API error for "${title}": ${response.status} - ${response.statusText}`);
    }
    
    return 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg';
  } catch (error) {
    console.error(`Error fetching image for "${title}":`, error);
    return 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg';
  }
}

// Process multiple image requests in true parallel fashion
async function batchGetRecipeImages(recipeBatch: Array<{
  title: string;
  description: string;
  cuisine: string;
}>): Promise<Map<string, string>> {
  try {
    console.log(`Starting parallel image fetching for ${recipeBatch.length} recipes`);
    
    // Create a map to store results
    const results = new Map<string, string>();
    
    // Create an array of promises for parallel execution
    // Each promise is an independent API call to Apify
    const fetchPromises = recipeBatch.map(async (recipe) => {
      // Check cache first before making the API call
      if (imageUrlCache.has(recipe.title)) {
        console.log(`Using cached image for: ${recipe.title}`);
        results.set(recipe.title, imageUrlCache.get(recipe.title)!);
        return;
      }
      
      // Make the API call for this specific recipe
      const imageUrl = await fetchSingleRecipeImage(recipe.title);
      results.set(recipe.title, imageUrl);
    });
    
    // Wait for all parallel requests to complete
    await Promise.all(fetchPromises);
    console.log(`Completed parallel image fetching for ${recipeBatch.length} recipes`);
    
    return results;
  } catch (error) {
    console.error('Error in parallel image fetching:', error);
    
    // Create fallback map for all recipes
    const fallbackResults = new Map<string, string>();
    for (const recipe of recipeBatch) {
      fallbackResults.set(recipe.title, 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg');
    }
    return fallbackResults;
  }
}

// Image request queue to batch API calls
let pendingImageRequests: Array<{
  recipe: { title: string; description: string; cuisine: string };
  resolve: (url: string) => void;
}> = [];

// Batch processor timer reference
let batchTimerRef: ReturnType<typeof setTimeout> | null = null;

// Modified getRecipeImage function that uses the batch processing with true parallelism
async function getRecipeImage(title: string, description: string, cuisine: string): Promise<string> {
  // Check cache first
  if (imageUrlCache.has(title)) {
    console.log(`Using cached image for: ${title}`);
    return imageUrlCache.get(title)!;
  }
  
  // Return a promise that will be resolved when the batch processes
  return new Promise((resolve) => {
    // Add this request to the pending queue
    pendingImageRequests.push({
      recipe: { title, description, cuisine },
      resolve
    });
    
    // If we already have a timer running, let it handle the batch
    if (batchTimerRef) return;
    
    // Otherwise, set up a new batch timer
    batchTimerRef = setTimeout(async () => {
      // Take up to 8 requests from the queue
      const MAX_PARALLEL = 8; // Maximum number of parallel API calls
      const batchToProcess = pendingImageRequests.slice(0, MAX_PARALLEL);
      pendingImageRequests = pendingImageRequests.slice(MAX_PARALLEL);
      
      // Clear the timer reference
      batchTimerRef = null;
      
      // If there are still pending requests, set up another timer
      if (pendingImageRequests.length > 0) {
        batchTimerRef = setTimeout(() => {
          // The batch processor will run again
          batchTimerRef = null;
        }, 100); // Small delay before processing next batch
      }
      
      // Process this batch with true parallelism
      try {
        console.log(`Processing batch of ${batchToProcess.length} image requests in parallel`);
        const recipeBatch = batchToProcess.map(req => req.recipe);
        const resultMap = await batchGetRecipeImages(recipeBatch);
        
        // Resolve all promises with their corresponding images
        for (const request of batchToProcess) {
          const imageUrl = resultMap.get(request.recipe.title) || 
                          'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg';
          request.resolve(imageUrl);
        }
      } catch (error) {
        console.error('Error in batch processing:', error);
        // Resolve all with fallback on error
        for (const request of batchToProcess) {
          request.resolve('https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg');
        }
      }
    }, 50); // Small delay to allow batching of near-simultaneous requests
  });
}

export async function generateRecipe(ingredients: string[], preferences?: {
  cuisine?: string;
  difficulty?: string;
  dietaryRestrictions?: DietaryRestriction[];
  requireAllIngredients?: boolean;
  maxCookingTime?: number;
  maxIngredients?: number;
  previousRecipes?: string[];
}) {
  if (!ingredients || ingredients.length === 0) {
    throw new Error('No ingredients provided');
  }

  const prompt = `Generate a recipe following these EXACT specifications. Your response must be ONLY a valid JSON object.

INGREDIENTS TO USE: ${preferences?.requireAllIngredients ? 'ALL' : 'some or all'} of these ingredients: ${ingredients.join(', ')}
${preferences?.cuisine ? `CUISINE: ${preferences.cuisine}` : ''}
${preferences?.difficulty ? `DIFFICULTY: ${preferences.difficulty}` : ''}
${preferences?.dietaryRestrictions?.length ? `DIETARY RESTRICTIONS: ${preferences.dietaryRestrictions.join(', ')}` : ''}
${preferences?.maxCookingTime ? `MAXIMUM COOKING TIME: ${preferences.maxCookingTime} minutes` : ''}
${preferences?.maxIngredients ? `MAXIMUM INGREDIENTS: ${preferences.maxIngredients}` : ''}
${preferences?.previousRecipes?.length ? `PREVIOUSLY GENERATED RECIPES (DO NOT DUPLICATE THESE OR CREATE SIMILAR VARIATIONS): ${preferences.previousRecipes.join(', ')}` : ''}

IMPORTANT DIVERSITY REQUIREMENTS:
- Your recipe MUST be substantially different from any previously generated recipes listed above
- DO NOT create minor variations of existing recipes (e.g., "Garlic Pasta" vs "Garlic Noodles")
- Ensure the recipe name is descriptive but AVOID starting with generic terms like "Quick" or "Simple" if possible
- Create recipes that use the ingredients in CREATIVE and DIVERSE ways
- If the same ingredients have been used for multiple recipes, try a COMPLETELY DIFFERENT dish type

RESPONSE FORMAT:
{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "ingredients": [
    {
      "item": "Ingredient name",
      "amount": "2",
      "unit": "cups"
    }
  ],
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "cookTime": "30",
  "servings": "4",
  "difficulty": "beginner",
  "cuisine": "italian",
  "imageDescription": "Visual description for image search"
}

STRICT FORMAT RULES:
1. ALL numeric values MUST be strings with quotes (e.g., "amount": "2", NOT "amount": 2)
2. ALL fractions MUST be strings (e.g., "amount": "1/2", NOT "amount": 1/2)
3. difficulty MUST be exactly "beginner", "intermediate", or "advanced"
4. NO trailing commas in JSON
5. NO comments or additional text
6. NO markdown formatting
7. ALL fields are required
8. Arrays must have at least one item
9. ALL strings must use double quotes, not single quotes
10. Ingredients must follow the exact structure shown above
11. null values are not allowed, use empty string "" instead

EXAMPLES:
✅ CORRECT:
{
  ...
  "ingredients": [
    {
      "item": "Flour",
      "amount": "1/2",
      "unit": "cup"
    }
  ],
  "cookTime": "15",
  ...
}

❌ INCORRECT:
{
  ...
  "ingredients": [
    {
      "item": "Flour",
      "amount": 1/2,
      "unit": null
    }
  ],
  "cookTime": 15,
  ...
}`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    try {
      // Remove any potential markdown formatting
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // Fix missing commas in arrays (common error in instructions array)
      text = text.replace(/",\s*"([^"]+)"\s*\]/g, '", "$1"]');
      text = text.replace(/",\s*"([^"]+)"\s*(?=\n\s*")/g, '", "$1",');
      
      // Fix missing commas between array items (like in the instructions array)
      text = text.replace(/"([^"]+)"\s+"/g, '"$1", "');
      
      // Fix null values in unit fields
      text = text.replace(/"unit":\s*null/g, '"unit": ""');
      
      console.log("Preprocessed response:", text);
      
      // Parse and validate the response
      const parsed = JSON.parse(text);
      
      // Enhanced validation with specific error messages
      const validateRecipe = (recipe: any): recipe is GeneratedRecipe => {
        const errors: string[] = [];
        
        // Required fields and types
        if (typeof recipe.title !== 'string' || !recipe.title.trim()) 
          errors.push('Missing or invalid title');
        
        if (typeof recipe.description !== 'string' || !recipe.description.trim())
          errors.push('Missing or invalid description');
        
        if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0)
          errors.push('Missing or invalid ingredients array');
        
        if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0)
          errors.push('Missing or invalid instructions array');
        
        if (typeof recipe.cookTime !== 'string' || !/^\d+$/.test(recipe.cookTime))
          errors.push('cookTime must be a string containing only digits');
        
        if (typeof recipe.servings !== 'string' || !/^\d+$/.test(recipe.servings))
          errors.push('servings must be a string containing only digits');
        
        if (!['beginner', 'intermediate', 'advanced'].includes(recipe.difficulty))
          errors.push('Invalid difficulty level');
        
        // Set default cuisine if missing
        if (!recipe.cuisine || typeof recipe.cuisine !== 'string' || !recipe.cuisine.trim()) {
          recipe.cuisine = 'other';
        }
        
        if (typeof recipe.imageDescription !== 'string' || !recipe.imageDescription.trim())
          errors.push('Missing or invalid imageDescription');
        
        // Validate ingredients structure with more lenient amount validation
        if (Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((ing: { item: string; amount: string; unit: string }, index: number) => {
            if (!ing || typeof ing !== 'object')
              errors.push(`Invalid ingredient object at index ${index}`);
            else {
              if (typeof ing.item !== 'string' || !ing.item.trim())
                errors.push(`Missing or invalid item at ingredient ${index}`);
              // Allow empty amounts for ingredients that might be "to taste" or optional
              if (typeof ing.amount !== 'string')
                errors.push(`Invalid amount type at ingredient ${index}`);
              if (typeof ing.unit !== 'string')
                errors.push(`Invalid unit type at ingredient ${index}`);
              
              // Set empty string for null/undefined values
              if (ing.unit === null || ing.unit === undefined) {
                ing.unit = "";
              }
            }
          });
        }

        if (errors.length > 0) {
          console.error('Validation errors:', errors);
          return false;
        }
        
        return true;
      };

      if (!validateRecipe(parsed)) {
        throw new Error('Generated recipe does not match required format');
      }

      const generatedRecipe = parsed as GeneratedRecipe;

      // Transform to Recipe type
      const recipe: Recipe = {
        id: Math.random().toString(36).substr(2, 9),
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        ingredients: generatedRecipe.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.item}`),
        instructions: generatedRecipe.instructions,
        cookingTime: parseInt(generatedRecipe.cookTime),
        servings: parseInt(generatedRecipe.servings),
        difficulty: generatedRecipe.difficulty as CookingSkillLevel,
        cuisineType: (generatedRecipe.cuisine || 'other').toLowerCase() as CuisineType,
        dietaryRestrictions: preferences?.dietaryRestrictions || [],
        calories: 0,
        rating: 0,
        imageUrl: await getRecipeImage(generatedRecipe.title, generatedRecipe.description, generatedRecipe.cuisine),
        equipment: []
      };

      return recipe;
    } catch (parseError) {
      console.error('Error parsing or validating Gemini response:', parseError);
      console.error('Raw response:', text);
      throw new Error('Failed to parse or validate recipe from AI response');
    }
  } catch (error) {
    console.error('Error generating recipe:', error);
    throw error;
  }
} 