import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChefHat, Clock, Search, Star, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type { Recipe } from '../lib/types';
import { getRandomRecipes, searchRecipes, getRecipesByArea } from '../lib/mealdb';
import { RecipeDetail } from '../components/ui/recipe-detail';

const FILTERS = {
  cuisineType: [
    { value: 'all', label: 'All Cuisines' },
    { value: 'Italian', label: 'Italian' },
    { value: 'Chinese', label: 'Chinese' },
    { value: 'Mexican', label: 'Mexican' },
    { value: 'Indian', label: 'Indian' },
    { value: 'American', label: 'American' },
    { value: 'French', label: 'French' },
    { value: 'Thai', label: 'Thai' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Greek', label: 'Greek' },
  ],
  cookingTime: [
    { value: 'all', label: 'Any Time' },
    { value: '15', label: '15 minutes or less' },
    { value: '30', label: '30 minutes or less' },
    { value: '60', label: '1 hour or less' },
  ],
  difficulty: [
    { value: 'all', label: 'Any Level' },
    { value: 'beginner', label: 'Beginner Friendly' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ],
  dietary: [
    { value: 'all', label: 'All' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'gluten-free', label: 'Gluten-Free' },
  ],
};

export function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDietary, setSelectedDietary] = useState('all');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const searchTimeoutRef = useRef<number>();

  // Load initial recommended recipes only once
  useEffect(() => {
    loadRecommendedRecipes();
  }, []); // Empty dependency array means this runs once on mount

  const loadRecommendedRecipes = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setPage(1);
      setRecipes([]);
    }
    
    setLoading(true);
    setError(null);

    try {
      const newRecipes = await getRandomRecipes();
      
      if (isLoadMore) {
        setRecipes(prev => [...prev, ...newRecipes]);
      } else {
        setRecipes(newRecipes);
      }
      
      setHasMore(newRecipes.length > 0);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setError(err.message);
        setHasMore(false);
      } else {
        setError('Failed to fetch recipes. Please try again.');
        console.error('Error fetching recipes:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as it doesn't use any external values

  const handleSearch = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setPage(1);
      setRecipes([]);
    }

    if (!searchQuery.trim() && selectedCuisine === 'all') {
      await loadRecommendedRecipes(isLoadMore);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let results: Recipe[] = [];

      if (searchQuery.trim()) {
        results = await searchRecipes(searchQuery);
      } else if (selectedCuisine !== 'all') {
        results = await getRecipesByArea(selectedCuisine);
      }

      // Apply filters
      results = results.filter(recipe => {
        if (selectedTime !== 'all') {
          const maxTime = parseInt(selectedTime);
          if (recipe.cookingTime > maxTime) return false;
        }

        if (selectedDifficulty !== 'all' && recipe.difficulty !== selectedDifficulty) {
          return false;
        }

        if (selectedDietary !== 'all' && !recipe.dietaryRestrictions.includes(selectedDietary as any)) {
          return false;
        }

        return true;
      });

      if (isLoadMore) {
        setRecipes(prev => [...prev, ...results]);
      } else {
        setRecipes(results);
      }
      
      setHasMore(results.length > 0);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setError(err.message);
        setHasMore(false);
      } else {
        setError('Failed to fetch recipes. Please try again.');
        console.error('Error fetching recipes:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCuisine, selectedTime, selectedDifficulty, selectedDietary, loadRecommendedRecipes]);

  // Debounce search and filter changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      handleSearch(false);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [handleSearch]);

  // Intersection Observer for infinite scrolling
  const lastRecipeElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
        handleSearch(true);
      }
    });

    if (node) {
      observer.current.observe(node);
    }
  }, [loading, hasMore, handleSearch]);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6 space-y-6 sticky top-24">
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Search & Filters</h3>
            <div className="space-y-4">
              <div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes..."
                  className="w-full"
                />
              </div>
              
              <Button onClick={() => handleSearch(false)} disabled={loading} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Type
              </label>
              <select
                value={selectedCuisine}
                onChange={(e) => {
                  setSelectedCuisine(e.target.value);
                  handleSearch(false);
                }}
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
              >
                {FILTERS.cuisineType.map((cuisine) => (
                  <option key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooking Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  handleSearch(false);
                }}
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
              >
                {FILTERS.cookingTime.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  handleSearch(false);
                }}
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
              >
                {FILTERS.difficulty.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dietary Restrictions
              </label>
              <select
                value={selectedDietary}
                onChange={(e) => {
                  setSelectedDietary(e.target.value);
                  handleSearch(false);
                }}
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200"
              >
                {FILTERS.dietary.map((diet) => (
                  <option key={diet.value} value={diet.value}>
                    {diet.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Discover New Recipes
            </h2>
            <p className="mt-2 text-gray-600">
              Explore delicious recipes from around the world
            </p>
          </div>

          <div className="space-y-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            ) : recipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {recipes.map((recipe, index) => (
                  <div
                    key={`${recipe.id}-${index}`}
                    ref={index === recipes.length - 1 ? lastRecipeElementRef : null}
                    className="group bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-xl font-semibold text-white">{recipe.title}</h3>
                        <p className="text-white/90 text-sm mt-1 line-clamp-2">{recipe.description}</p>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {recipe.cookingTime}m
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {recipe.servings}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{recipe.rating}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {recipe.dietaryRestrictions.map((restriction) => (
                          <span
                            key={restriction}
                            className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                          >
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
                  <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No recipes found</h3>
                  <p className="mt-2 text-gray-500">
                    Try adjusting your search or filters to discover more recipes
                  </p>
                </div>
              </div>
            ) : null}

            {loading && (
              <div ref={loadingRef} className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading more recipes...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}