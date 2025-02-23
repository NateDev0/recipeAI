import { z } from 'zod';

const EDAMAM_APP_ID = '9cfd4288';
const EDAMAM_APP_KEY = '1d6b5ef067d71fb30d3cb0b8f0a8d0e7';

const FoodItemSchema = z.object({
  food: z.object({
    foodId: z.string(),
    label: z.string(),
    image: z.string().optional(),
    category: z.string(),
  }),
});

export type FoodSearchItem = z.infer<typeof FoodItemSchema>;

// Add debounce to prevent too many requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // ms

export async function searchFoods(query: string): Promise<FoodSearchItem[]> {
  if (!query) return [];

  // Rate limiting
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    return [];
  }
  lastRequestTime = now;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `https://api.edamam.com/api/food-database/v2/parser?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded, please try again later');
      }
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response format');
    }

    if (!data.hints || !Array.isArray(data.hints)) {
      return [];
    }
    
    return data.hints
      .slice(0, 10)
      .map((hint: any) => {
        try {
          if (!hint?.food?.label) return null;
          
          return {
            food: {
              foodId: hint.food.foodId || String(Math.random()),
              label: hint.food.label,
              image: hint.food.image || undefined,
              category: hint.food.category || 'Other',
            },
          };
        } catch (err) {
          console.warn('Error parsing food item:', err);
          return null;
        }
      })
      .filter((item): item is FoodSearchItem => item !== null);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}