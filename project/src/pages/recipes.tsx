import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChefHat, Clock, Filter, Search, SlidersHorizontal, Star, Users, RefreshCw, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { RecipeDetail } from '../components/ui/recipe-detail';
import { supabase } from '../lib/supabase';
import { generateRecipe } from '../lib/gemini';
import { useAuth } from '../contexts/auth-context';
import type {
  Recipe,
  RecipeFilters,
  CookingSkillLevel,
  DietaryPreset,
  CuisineType,
  DietaryRestriction,
  FoodItem
} from '../lib/types';

const SKILL_LEVELS: { value: CookingSkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const DIETARY_PRESETS: {
  value: DietaryPreset;
  label: string;
  description: string;
  emoji: string;
  settings: Partial<RecipeFilters>;
}[] = [
  {
    value: 'teen-friendly',
    label: 'Teen-Friendly',
    description: 'Quick, simple, minimal ingredients, microwave-friendly',
    emoji: '🧑‍🦱',
    settings: {
      skillLevel: 'beginner',
      cookingTime: 15,
      maxIngredients: 5,
      dietaryRestrictions: [],
      sortBy: 'time',
      sortOrder: 'asc'
    }
  },
  {
    value: 'dad-bod-comfort',
    label: 'Dad Bod Comfort',
    description: 'Rich, buttery, hearty portions, indulgent',
    emoji: '👨',
    settings: {
      skillLevel: 'intermediate',
      cookingTime: 45,
      dietaryRestrictions: [],
      sortBy: 'rating',
      sortOrder: 'desc'
    }
  },
  {
    value: 'health-nut',
    label: 'Health Nut',
    description: 'Low-calorie, high-protein, nutrient-dense',
    emoji: '🏃',
    settings: {
      skillLevel: 'intermediate',
      dietaryRestrictions: ['low-carb'],
      calorieRange: { min: 200, max: 500 },
      sortBy: 'rating',
      sortOrder: 'desc'
    }
  },
  {
    value: 'budget-chef',
    label: 'Budget Chef',
    description: 'Cost-effective, common ingredients, bulk-friendly',
    emoji: '💰',
    settings: {
      skillLevel: 'beginner',
      maxIngredients: 8,
      sortBy: 'ingredients',
      sortOrder: 'asc'
    }
  },
  {
    value: 'time-saver',
    label: 'Time-Saver',
    description: '30 minutes or less, one-pot meals',
    emoji: '⏰',
    settings: {
      skillLevel: 'beginner',
      cookingTime: 30,
      sortBy: 'time',
      sortOrder: 'asc'
    }
  },
];

const CUISINE_TYPES: { value: CuisineType; label: string }[] = [
  { value: 'american', label: 'American' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'asian', label: 'Asian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'indian', label: 'Indian' },
  { value: 'french', label: 'French' },
  { value: 'other', label: 'Other' },
];

const DIETARY_RESTRICTIONS: { value: DietaryRestriction; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
  { value: 'nut-free', label: 'Nut-Free' },
  { value: 'low-carb', label: 'Low-Carb' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
];

interface RecipeWithMatch extends Recipe {
  matchScore: number;
  matchingIngredients: string[];
  missingIngredients: string[];
}

export function Recipes() {
  const { user } = useAuth();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    ingredients: [],
    skillLevel: 'beginner',
    dietaryRestrictions: [],
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const [allRecipes, setAllRecipes] = useState<RecipeWithMatch[]>([]);
  const [visibleRecipes, setVisibleRecipes] = useState<RecipeWithMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [pantryItems, setPantryItems] = useState<FoodItem[]>([]);
  const [loadingPantry, setLoadingPantry] = useState(true);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const RECIPES_PER_PAGE = 5;

  const filtersRef = useRef<HTMLDivElement>(null);
  const defaultFilters = useRef<RecipeFilters>({
    ingredients: [],
    skillLevel: 'beginner',
    dietaryRestrictions: [],
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  useEffect(() => {
    if (user) {
      fetchPantryItems();
    }
  }, [user]);

  useEffect(() => {
    if (allRecipes.length > 0) {
      setVisibleRecipes(allRecipes.slice(0, page * RECIPES_PER_PAGE));
    }
  }, [page, allRecipes]);

  const matchRecipeIngredients = useCallback((recipe: Recipe, pantryItems: FoodItem[]): RecipeWithMatch => {
    const matchingIngredients: string[] = [];
    const missingIngredients: string[] = [];

    recipe.ingredients.forEach(ingredient => {
      const normalizedIngredient = ingredient.toLowerCase();
      const match = pantryItems.some(item => 
        normalizedIngredient.includes(item.name.toLowerCase()) && item.current_quantity > 0
      );

      if (match) {
        matchingIngredients.push(ingredient);
      } else {
        missingIngredients.push(ingredient);
      }
    });

    const matchScore = (matchingIngredients.length / recipe.ingredients.length) * 100;

    return {
      ...recipe,
      matchScore,
      matchingIngredients,
      missingIngredients
    };
  }, []);

  const fetchPantryItems = async () => {
    if (!user) return;

    try {
      setLoadingPantry(true);
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setPantryItems(data || []);
    } catch (err) {
      console.error('Error fetching pantry items:', err);
      setError('Failed to fetch pantry items');
    } finally {
      setLoadingPantry(false);
    }
  };

  const handlePresetClick = (preset: typeof DIETARY_PRESETS[0]) => {
    const scrollPos = filtersRef.current?.scrollTop || 0;

    if (activePreset === preset.value) {
      setActivePreset(null);
      requestAnimationFrame(() => {
        setFilters(defaultFilters.current);
        if (filtersRef.current) {
          filtersRef.current.scrollTop = scrollPos;
        }
      });
      return;
    }

    setActivePreset(preset.value);
    requestAnimationFrame(() => {
      setFilters(prev => ({
        ...prev,
        ...preset.settings,
      }));
      if (filtersRef.current) {
        filtersRef.current.scrollTop = scrollPos;
      }
    });
  };

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      // Get ingredients from pantry
      const availableIngredients = pantryItems
        .filter(item => item.current_quantity > 0)
        .map(item => item.name);

      if (availableIngredients.length === 0) {
        setError('No ingredients available in your pantry');
        setAllRecipes([]);
        return;
      }

      // Get current preset settings if any
      const currentPreset = DIETARY_PRESETS.find(preset => preset.value === activePreset);
      const effectiveFilters = currentPreset ? { ...filters, ...currentPreset.settings } : filters;

      // Generate recipes sequentially to avoid rate limits
      const generatedRecipes: RecipeWithMatch[] = [];
      const TOTAL_RECIPES = 10;
      const MIN_MATCH_SCORE = 60;
      let attempts = 0;
      const MAX_ATTEMPTS = 20; // Prevent infinite loops

      for (let i = 0; i < TOTAL_RECIPES && attempts < MAX_ATTEMPTS; i++) {
        try {
          // Add a small delay between requests
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Always try for 100% first, then gradually reduce requirements
          const attemptNumber = attempts - (Math.floor(attempts / TOTAL_RECIPES) * TOTAL_RECIPES);
          const minRequiredIngredients = Math.max(
            Math.ceil(availableIngredients.length * (1 - (attemptNumber * 0.1))),
            Math.ceil(availableIngredients.length * (MIN_MATCH_SCORE / 100))
          );
          
          // Select ingredients based on current attempt
          const selectedIngredients = availableIngredients.slice(0, minRequiredIngredients);
          
          // Track previously generated recipe titles to avoid duplicates and similar variations
          const previousRecipeTitles = generatedRecipes.map(recipe => recipe.title);

          const recipe = await generateRecipe(selectedIngredients, {
            cuisine: effectiveFilters.cuisineType,
            difficulty: effectiveFilters.skillLevel,
            dietaryRestrictions: effectiveFilters.dietaryRestrictions,
            requireAllIngredients: true,
            maxCookingTime: effectiveFilters.cookingTime,
            maxIngredients: effectiveFilters.maxIngredients,
            previousRecipes: previousRecipeTitles // Pass the list of previously generated recipes
          });

          const processedRecipe = matchRecipeIngredients(recipe, pantryItems);
          
          // Only accept recipes that match our criteria
          const meetsTimeLimit = !effectiveFilters.cookingTime || recipe.cookingTime <= effectiveFilters.cookingTime;
          const meetsIngredientLimit = !effectiveFilters.maxIngredients || recipe.ingredients.length <= effectiveFilters.maxIngredients;
          
          // Check if the recipe is too similar to existing recipes (additional check for redundancy)
          const isTooSimilar = generatedRecipes.some(existingRecipe => {
            // More rigorous title similarity check
            const normalizeTitle = (title: string) => {
              return title.toLowerCase()
                .replace(/\b(quick|simple|easy|fast|basic|speedy|cheesy|tasty|delicious|homemade|classic|traditional)\b/g, '')
                .trim();
            };
            
            const normalizedNewTitle = normalizeTitle(recipe.title);
            const normalizedExistingTitle = normalizeTitle(existingRecipe.title);
            
            // Compare ingredients - significant overlap suggests similar recipe
            const newIngredientSet = new Set(recipe.ingredients.map(ing => ing.toLowerCase()));
            const existingIngredientSet = new Set(existingRecipe.ingredients.map(ing => ing.toLowerCase()));
            
            // Calculate Jaccard similarity for ingredients (intersection over union)
            const ingredientIntersection = [...newIngredientSet].filter(ing => {
              // Check for partial matches in the existing ingredient set
              return [...existingIngredientSet].some(existIng => 
                ing.includes(existIng) || existIng.includes(ing)
              );
            }).length;
            
            const ingredientUnion = newIngredientSet.size + existingIngredientSet.size - ingredientIntersection;
            const ingredientSimilarity = ingredientIntersection / ingredientUnion;
            
            // Compare cooking time - very similar cooking times suggest similar recipes
            const cookingTimeSimilarity = 1 - Math.abs(recipe.cookingTime - existingRecipe.cookingTime) / 60;
            
            // Compare descriptions - similar descriptions often mean similar recipes
            const descSimilarity = stringSimilarity(
              recipe.description.toLowerCase(), 
              existingRecipe.description.toLowerCase()
            );
            
            // Title match conditions
            const titleMatch = 
              normalizedNewTitle === normalizedExistingTitle || // Exact match after normalization
              (normalizedNewTitle.includes(normalizedExistingTitle) && normalizedExistingTitle.length > 5) || // One contains the other
              (normalizedExistingTitle.includes(normalizedNewTitle) && normalizedNewTitle.length > 5) ||
              stringSimilarity(normalizedNewTitle, normalizedExistingTitle) > 0.6; // High similarity score
              
            // Combined similarity score
            const overallSimilarity = (
              (titleMatch ? 0.5 : 0) + 
              (ingredientSimilarity * 0.3) + 
              (cookingTimeSimilarity * 0.1) + 
              (descSimilarity * 0.1)
            );
            
            console.log(`Similarity check - ${recipe.title} vs ${existingRecipe.title}: ${overallSimilarity.toFixed(2)}`);
            
            // Consider too similar if overall similarity is high
            return overallSimilarity > 0.5;
          });
          
          // Helper function to calculate string similarity (0-1 where 1 is identical)
          function stringSimilarity(str1: string, str2: string): number {
            if (str1 === str2) return 1.0;
            if (str1.length === 0 || str2.length === 0) return 0.0;
            
            // Count common words
            const words1 = str1.split(/\s+/);
            const words2 = str2.split(/\s+/);
            const wordSet1 = new Set(words1);
            const wordSet2 = new Set(words2);
            
            let commonWords = 0;
            for (const word of wordSet1) {
              if (wordSet2.has(word)) commonWords++;
            }
            
            return (2 * commonWords) / (wordSet1.size + wordSet2.size);
          }
          
          if (processedRecipe.matchScore >= MIN_MATCH_SCORE && 
              meetsTimeLimit && 
              meetsIngredientLimit && 
              !isTooSimilar) {
            generatedRecipes.push(processedRecipe);
            i++; // Only increment if we got a valid recipe
          } else if (isTooSimilar) {
            console.log(`Skipping too similar recipe: ${recipe.title}`);
            // Don't increment i here, as we're rejecting this recipe
          }

          attempts++;
        } catch (error) {
          console.error(`Error generating recipe (attempt ${attempts + 1}):`, error);
          attempts++;
        }
      }

      if (generatedRecipes.length === 0) {
        throw new Error('Unable to generate any recipes. Please try again later.');
      }

      // Sort recipes according to filter settings
      const sortedRecipes = sortRecipes(generatedRecipes, effectiveFilters.sortBy || 'rating', effectiveFilters.sortOrder || 'desc');

      setAllRecipes(sortedRecipes);
      setVisibleRecipes(sortedRecipes.slice(0, RECIPES_PER_PAGE));
    } catch (error) {
      console.error('Error generating recipes:', error);
      setError('Failed to generate recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sortRecipes = (recipes: RecipeWithMatch[], sortBy: RecipeFilters['sortBy'], sortOrder: 'asc' | 'desc') => {
    return [...recipes].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'time':
          comparison = a.cookingTime - b.cookingTime;
          break;
        case 'difficulty':
          comparison = getDifficultyScore(a.difficulty) - getDifficultyScore(b.difficulty);
          break;
        case 'rating':
          comparison = b.matchScore - a.matchScore; // Higher match score first
          break;
        case 'ingredients':
          comparison = a.ingredients.length - b.ingredients.length;
          break;
        default:
          comparison = b.matchScore - a.matchScore;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const getDifficultyScore = (difficulty: CookingSkillLevel) => {
    switch (difficulty) {
      case 'beginner': return 1;
      case 'intermediate': return 2;
      case 'advanced': return 3;
      default: return 2;
    }
  };

  const loadMore = () => {
    if (visibleRecipes.length < allRecipes.length) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Recipe Suggestions
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Based on {pantryItems.filter(i => i.current_quantity > 0).length} ingredients in your pantry
          </p>
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
            onClick={fetchRecipes}
            disabled={loading || loadingPantry}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Suggestions
          </Button>
        </div>
      </div>

      {isFiltersOpen && (
        <div ref={filtersRef} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {DIETARY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset)}
                  className={`group relative p-3 rounded-lg text-left transition-all duration-300 ${
                    activePreset === preset.value
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                      : 'bg-white hover:bg-gray-50 hover:ring-2 hover:ring-primary/20 hover:ring-offset-2'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className={`text-sm transition-opacity duration-200 ${
                    activePreset === preset.value ? 'opacity-90' : 'opacity-60'
                  }`}>
                    {preset.description}
                  </div>
                  <div className={`absolute -top-2 -right-2 transform transition-all duration-300 ${
                    activePreset === preset.value
                      ? 'opacity-100 translate-y-[-8px] rotate-12'
                      : 'opacity-0 group-hover:opacity-100 group-hover:translate-y-[-8px] group-hover:rotate-12'
                  }`}>
                    <span className="text-2xl">{preset.emoji}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooking Skill Level
              </label>
              <select
                value={filters.skillLevel}
                onChange={(e) => setFilters({
                  ...filters,
                  skillLevel: e.target.value as CookingSkillLevel
                })}
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Cooking Time (minutes)
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={filters.cookingTime || 30}
                onChange={(e) => setFilters({
                  ...filters,
                  cookingTime: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <div className="text-sm text-gray-500 mt-1">
                {filters.cookingTime || 30} minutes
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Type
              </label>
              <select
                value={filters.cuisineType}
                onChange={(e) => setFilters({
                  ...filters,
                  cuisineType: e.target.value as CuisineType
                })}
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
              >
                <option value="">Any</option>
                {CUISINE_TYPES.map((cuisine) => (
                  <option key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dietary Restrictions
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <button
                  key={restriction.value}
                  onClick={() => {
                    const current = filters.dietaryRestrictions || [];
                    const updated = current.includes(restriction.value)
                      ? current.filter(r => r !== restriction.value)
                      : [...current, restriction.value];
                    setFilters({
                      ...filters,
                      dietaryRestrictions: updated
                    });
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-all duration-200 transform hover:scale-105 ${
                    filters.dietaryRestrictions?.includes(restriction.value)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {restriction.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({
                ...filters,
                sortBy: e.target.value as RecipeFilters['sortBy']
              })}
              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
            >
              <option value="time">Preparation Time</option>
              <option value="difficulty">Difficulty Level</option>
              <option value="rating">Rating</option>
              <option value="ingredients">Number of Ingredients</option>
            </select>
            <button
              onClick={() => setFilters({
                ...filters,
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
              })}
              className="p-1 rounded hover:bg-gray-100 transition-transform duration-200 hover:scale-110"
            >
              <SlidersHorizontal className={`h-4 w-4 transition-transform duration-200 ${
                filters.sortOrder === 'desc' ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(loading || loadingPantry) ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-500">
              {loadingPantry ? "Loading your pantry..." : "Generating recipe suggestions..."}
            </p>
          </div>
        ) : error && hasSearched ? (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        ) : visibleRecipes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 overflow-hidden hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="relative">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium">
                      {recipe.matchScore.toFixed(0)}% Match
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{recipe.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{recipe.description}</p>
                    
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
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
                        {recipe.servings}
                      </div>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-400" />
                        {recipe.rating}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700">Ingredients:</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-green-600">
                          {recipe.matchingIngredients.length} available
                        </div>
                        <div className="text-sm text-red-600">
                          {recipe.missingIngredients.length} missing
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {recipe.dietaryRestrictions.map((restriction) => (
                        <span
                          key={restriction}
                          className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                        >
                          {restriction}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {visibleRecipes.length < allRecipes.length && (
              <div className="text-center mt-8">
                <Button
                  onClick={loadMore}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Load More Recipes
                </Button>
              </div>
            )}
          </>
        ) : hasSearched ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No recipes found</h3>
              <p className="mt-2 text-gray-500">
                {pantryItems.length === 0
                  ? "Add some ingredients to your pantry to get recipe suggestions"
                  : "Try adjusting your filters to find more recipes"}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Ready to Cook?</h3>
              <p className="mt-2 text-gray-500">
                {pantryItems.filter(i => i.current_quantity > 0).length === 0 
                  ? "Add ingredients to your pantry to get started"
                  : "Click 'Refresh Suggestions' to get AI-powered recipe ideas based on your pantry ingredients"}
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}