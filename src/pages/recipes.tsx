import React, { useState } from 'react';
import { ChefHat, Clock, Filter, Search, SlidersHorizontal, Star, Users, RefreshCw, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import type {
  Recipe,
  RecipeFilters,
  CookingSkillLevel,
  DietaryPreset,
  CuisineType,
  DietaryRestriction,
} from '../lib/types';

const SKILL_LEVELS: { value: CookingSkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// Sample empty recipe for testing UI
const emptyRecipes: Recipe[] = [];

export function RecipeDetailModal({ recipe, onClose }: { 
  recipe: Recipe;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">{recipe.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-64 object-cover rounded-lg" />
              
              <div className="mt-4">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {recipe.cookingTime}m
                  </div>
                  <div className="flex items-center">
                    <ChefHat className="h-4 w-4 mr-1" />
                    {recipe.difficulty}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {recipe.servings} servings
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-400" />
                    {recipe.rating}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Ingredients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, i) => (
                    <li key={i} className="text-gray-600">
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-600">{recipe.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Required Equipment</h3>
                <ul className="list-disc list-inside text-gray-600">
                  {recipe.equipment.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                <ol className="space-y-4">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                        {index + 1}
                      </div>
                      <p className="text-gray-600 flex-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Recipes() {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    ingredients: [],
    skillLevel: 'beginner',
    dietaryRestrictions: [],
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const [recipes] = useState<Recipe[]>(emptyRecipes); // Using empty static array
  const [loading] = useState(false); // No loading state needed
  const [error] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [page, setPage] = useState(1);
  const RECIPES_PER_PAGE = 12;

  // Calculate pagination
  const totalPages = Math.ceil(recipes.length / RECIPES_PER_PAGE);
  const startIndex = (page - 1) * RECIPES_PER_PAGE;
  const endIndex = startIndex + RECIPES_PER_PAGE;
  const visibleRecipes = recipes.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Recipes
          </h2>
        </div>
        <div className="mt-4 flex gap-2 md:ml-4 md:mt-0">
          <Button
            variant="outline"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            disabled={true} // Disabled since we removed fetching
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="text-center py-12">
          <p className="text-gray-500">No recipes available.</p>
          <p className="text-sm text-gray-400 mt-2">Recipe functionality has been removed.</p>
        </div>
      </div>

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
} 