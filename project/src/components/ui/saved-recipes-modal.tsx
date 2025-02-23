import React, { useState, useEffect } from 'react';
import { X, ChefHat, Clock, Users, Star, Trash2 } from 'lucide-react';
import { Button } from './button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/auth-context';
import type { Recipe } from '../../lib/types';
import { RecipeDetail } from './recipe-detail';

interface SavedRecipesModalProps {
  onClose: () => void;
}

interface SavedRecipe {
  id: string;
  recipe: Recipe;
  times_cooked: number;
  last_cooked: string | null;
}

export function SavedRecipesModal({ onClose }: SavedRecipesModalProps) {
  const { user } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (user) {
      fetchSavedRecipes();
    }
  }, [user]);

  async function fetchSavedRecipes() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('saved_recipes')
        .select(`
          id,
          times_cooked,
          last_cooked,
          recipes (
            id,
            title,
            description,
            ingredients,
            instructions,
            cooking_time,
            servings,
            difficulty,
            cuisine_type,
            dietary_restrictions,
            calories,
            rating,
            image_url,
            equipment
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedRecipes(
        data
          .filter(item => item.recipes) // Filter out any null recipes
          .map(item => ({
            id: item.id,
            recipe: item.recipes as Recipe,
            times_cooked: item.times_cooked,
            last_cooked: item.last_cooked,
          }))
      );
    } catch (err) {
      console.error('Error fetching saved recipes:', err);
      setError('Failed to load saved recipes');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(savedRecipeId: string) {
    try {
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('id', savedRecipeId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSavedRecipes(prev => prev.filter(recipe => recipe.id !== savedRecipeId));
    } catch (err) {
      console.error('Error deleting saved recipe:', err);
      setError('Failed to delete recipe');
    }
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed inset-4 md:inset-8 bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Saved Recipes</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : error ? (
              <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">
                {error}
              </div>
            ) : savedRecipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No saved recipes</h3>
                <p className="mt-2 text-gray-500">
                  Start saving recipes to build your collection
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedRecipes.map(({ id, recipe, times_cooked }) => (
                  <div
                    key={id}
                    className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div
                      className="relative aspect-video"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-medium line-clamp-1">
                          {recipe.title}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </Button>
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
                          <span>{recipe.rating}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Cooked {times_cooked} times
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}