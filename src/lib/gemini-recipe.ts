import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recipe, FoodItem } from './types';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI("AIzaSyBFZk9GquyjhDDlx0tDMIbDYLRJfIyavD4");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface GeminiRecipeMatch {
  recipe: Recipe;
  matchScore: number;
  matchingIngredients: string[];
  missingIngredients: string[];
  substitutes: { [ingredient: string]: string[] };
  aiExplanation: string;
}

async function analyzeIngredientMatch(
  recipeIngredients: string[],
  pantryItems: FoodItem[]
): Promise<{
  matchingIngredients: string[];
  missingIngredients: string[];
  substitutes: { [ingredient: string]: string[] };
  explanation: string;
}> {
  try {
    const prompt = `
    Analyze these recipe ingredients and pantry items to determine matches and possible substitutions:

    Recipe Ingredients:
    ${recipeIngredients.join('\n')}

    Pantry Items:
    ${pantryItems.map(item => `${item.name} (${item.current_quantity} ${item.unit})`).join('\n')}

    Please provide:
    1. Which recipe ingredients match with pantry items
    2. Which recipe ingredients are missing
    3. Possible substitutions using available pantry items
    4. A brief explanation of the matching logic
    
    Format the response as JSON with these keys:
    {
      "matchingIngredients": [],
      "missingIngredients": [],
      "substitutes": {},
      "explanation": ""
    }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const analysis = JSON.parse(response);
      return {
        matchingIngredients: analysis.matchingIngredients || [],
        missingIngredients: analysis.missingIngredients || [],
        substitutes: analysis.substitutes || {},
        explanation: analysis.explanation || "Analysis completed"
      };
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      // Fallback to basic matching if AI response parsing fails
      const basicMatching = recipeIngredients.reduce((acc, ingredient) => {
        const hasMatch = pantryItems.some(item => 
          ingredient.toLowerCase().includes(item.name.toLowerCase())
        );
        if (hasMatch) {
          acc.matchingIngredients.push(ingredient);
        } else {
          acc.missingIngredients.push(ingredient);
        }
        return acc;
      }, {
        matchingIngredients: [] as string[],
        missingIngredients: [] as string[],
        substitutes: {},
        explanation: "Basic ingredient matching performed"
      });
      return basicMatching;
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

export async function findRecipeMatchesWithAI(
  pantryItems: FoodItem[],
  filters: {
    minMatchScore?: number;
    cuisineType?: string;
    maxCookingTime?: number;
    difficulty?: string;
    dietaryRestrictions?: string[];
  } = {}
): Promise<GeminiRecipeMatch[]> {
  try {
    // Build the query
    let query = supabase
      .from('recipes')
      .select('*');

    // Apply filters
    if (filters.cuisineType) {
      query = query.eq('cuisine_type', filters.cuisineType);
    }
    if (filters.maxCookingTime) {
      query = query.lte('cooking_time', filters.maxCookingTime);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.dietaryRestrictions?.length) {
      query = query.contains('dietary_restrictions', filters.dietaryRestrictions);
    }

    const { data: recipes, error } = await query;

    if (error) throw error;
    if (!recipes) return [];

    // Filter out pantry items with zero quantity
    const availablePantryItems = pantryItems.filter(item => item.current_quantity > 0);

    // Analyze each recipe with AI
    const matches = await Promise.all(
      recipes.map(async (recipe) => {
        const analysis = await analyzeIngredientMatch(recipe.ingredients, availablePantryItems);
        
        const matchScore = (analysis.matchingIngredients.length / recipe.ingredients.length) * 100;

        return {
          recipe,
          matchScore,
          matchingIngredients: analysis.matchingIngredients,
          missingIngredients: analysis.missingIngredients,
          substitutes: analysis.substitutes,
          aiExplanation: analysis.explanation
        };
      })
    );

    // Filter and sort matches
    return matches
      .filter(match => match.matchScore >= (filters.minMatchScore || 0))
      .sort((a, b) => {
        // Primary sort by match score
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // Secondary sort by rating
        return b.recipe.rating - a.recipe.rating;
      });

  } catch (error) {
    console.error('Error finding recipe matches:', error);
    return [];
  }
} 