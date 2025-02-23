import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, Star, Users, X, ChevronDown, ChevronUp, Utensils, ScrollText, ArrowLeft, Check, ShoppingCart, DollarSign, ExternalLink, Calculator, AlertTriangle, BookmarkPlus, Bookmark } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import type { Recipe } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/auth-context';
import { searchProducts } from '../../lib/food-search';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
}

interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  current_quantity: number;
  used_in_recipes?: {
    recipe_id: string;
    recipe_name: string;
    amount: number;
    date: string;
  }[];
}

interface WalmartProduct {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  price: number;
}

interface IngredientProducts {
  [key: string]: {
    products: WalmartProduct[];
    selected: WalmartProduct | null;
    loading: boolean;
  };
}

export function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  const { user } = useAuth();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedIngredients, setUsedIngredients] = useState<Record<string, number>>({});
  const [ingredientProducts, setIngredientProducts] = useState<IngredientProducts>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPantryItems();
      checkIfRecipeIsSaved();
    }
  }, [user, recipe.id]);

  useEffect(() => {
    if (!loading && pantryItems.length >= 0) {
      loadMissingIngredientProducts();
    }
  }, [loading, pantryItems]);

  useEffect(() => {
    const newTotal = Object.values(ingredientProducts).reduce((sum, { selected }) => {
      return sum + (selected?.price || 0);
    }, 0);
    setTotalCost(newTotal);
  }, [ingredientProducts]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown && !(event.target as Element).closest('.product-dropdown')) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  async function checkIfRecipeIsSaved() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipe_id', recipe.id);

      if (error) {
        console.error('Error checking saved recipe:', error);
        return;
      }

      setIsSaved(data && data.length > 0);
    } catch (err) {
      console.error('Error checking saved recipe:', err);
    }
  }

  async function handleSaveRecipe() {
    if (!user) return;

    try {
      setSavingRecipe(true);
      setError(null);

      const { error: recipeError } = await supabase
        .from('recipes')
        .upsert([{
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          cooking_time: recipe.cookingTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          cuisine_type: recipe.cuisineType,
          dietary_restrictions: recipe.dietaryRestrictions || [],
          calories: recipe.calories,
          rating: recipe.rating,
          image_url: recipe.imageUrl,
          equipment: recipe.equipment || []
        }]);

      if (recipeError) throw recipeError;

      if (isSaved) {
        const { error: deleteError } = await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipe.id);

        if (deleteError) throw deleteError;
        setIsSaved(false);
      } else {
        const { error: saveError } = await supabase
          .from('saved_recipes')
          .insert([{
            user_id: user.id,
            recipe_id: recipe.id,
            times_cooked: 0
          }]);

        if (saveError) throw saveError;
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError('Failed to save recipe. Please try again.');
    } finally {
      setSavingRecipe(false);
    }
  }

  async function loadMissingIngredientProducts() {
    setLoadingProducts(true);
    const newIngredientProducts: IngredientProducts = {};

    try {
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        for (const ingredient of recipe.ingredients) {
          const matchingItem = pantryItems.find(item =>
            ingredient.toLowerCase().includes(item.name.toLowerCase())
          );

          if (!matchingItem || matchingItem.current_quantity === 0) {
            const products = await searchProducts(ingredient);
            newIngredientProducts[ingredient] = {
              products,
              selected: products[0] || null,
              loading: false
            };
          }
        }
      }

      setIngredientProducts(prev => ({ ...prev, ...newIngredientProducts }));
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchPantryItems() {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setPantryItems(data || []);
    } catch (err) {
      console.error('Error fetching pantry items:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleProductSelect(ingredient: string, product: WalmartProduct | null) {
    setIngredientProducts(prev => ({
      ...prev,
      [ingredient]: {
        ...prev[ingredient],
        selected: product
      }
    }));
  }

  async function handleCook() {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      for (const [itemId, amount] of Object.entries(usedIngredients)) {
        const item = pantryItems.find(i => i.id === itemId);
        if (!item) continue;

        const newUsage = {
          recipe_id: recipe.id,
          recipe_name: recipe.title,
          amount: amount,
          date: new Date().toISOString()
        };

        const { error } = await supabase
          .from('food_items')
          .update({
            used_in_recipes: [...(item.used_in_recipes || []), newUsage]
          })
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      if (isSaved) {
        const { error: updateError } = await supabase
          .from('saved_recipes')
          .update({ 
            times_cooked: supabase.sql`times_cooked + 1`,
            last_cooked: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('recipe_id', recipe.id);

        if (updateError) throw updateError;
      }

      await fetchPantryItems();
      setUsedIngredients({});
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update ingredients');
      }
      console.error('Error updating ingredients:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" onClick={onClose} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold flex-1">{recipe.title}</h1>
            <Button
              variant="ghost"
              onClick={handleSaveRecipe}
              disabled={savingRecipe}
              className="ml-4"
            >
              {savingRecipe ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              ) : isSaved ? (
                <>
                  <Bookmark className="h-4 w-4 mr-2 text-primary fill-primary" />
                  Saved
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  Save Recipe
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading recipe details...</p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{recipe.cookingTime}m</div>
                  <div className="text-xs text-muted-foreground">Cook Time</div>
                </div>
                <div className="bg-card rounded-xl p-4 text-center">
                  <ChefHat className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium capitalize">{recipe.difficulty}</div>
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                </div>
                <div className="bg-card rounded-xl p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{recipe.servings}</div>
                  <div className="text-xs text-muted-foreground">Servings</div>
                </div>
                <div className="bg-card rounded-xl p-4 text-center">
                  <Star className="h-5 w-5 mx-auto mb-2 text-yellow-400 fill-yellow-400" />
                  <div className="text-sm font-medium">{recipe.rating}</div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">About this Recipe</h2>
                <p className="text-muted-foreground">{recipe.description}</p>

                {recipe.dietaryRestrictions && recipe.dietaryRestrictions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Dietary Information</h3>
                    <div className="flex flex-wrap gap-2">
                      {recipe.dietaryRestrictions.map((restriction) => (
                        <span
                          key={restriction}
                          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        >
                          {restriction}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <ScrollText className="h-5 w-5 text-primary" />
                    Ingredients
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSaveRecipe}
                      disabled={savingRecipe}
                    >
                      {savingRecipe ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      ) : isSaved ? (
                        <>
                          <Bookmark className="h-4 w-4 mr-2 text-primary fill-primary" />
                          Saved
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-4 w-4 mr-2" />
                          Save Recipe
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCook}
                      disabled={loading || !usedIngredients || Object.keys(usedIngredients).length === 0}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <ChefHat className="h-4 w-4 mr-2" />
                          Cook This Recipe
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                    {error}
                  </div>
                )}

                {Object.keys(ingredientProducts).length > 0 && (
                  <div className="mb-6 bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-baseline">
                      <div className="text-sm text-blue-600">Total Cost at Walmart</div>
                      <div className="text-xl font-bold text-blue-700">
                        ${totalCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-blue-500 mt-1">
                      Based on selected products. Prices may vary by location.
                    </div>
                  </div>
                )}

                <ul className="space-y-6">
                  {recipe.ingredients && recipe.ingredients.map((ingredient, index) => {
                    const matchingItem = pantryItems.find(item =>
                      ingredient.toLowerCase().includes(item.name.toLowerCase())
                    );
                    const productInfo = ingredientProducts[ingredient];
                    
                    return (
                      <li key={index} className="group">
                        <div className="flex items-center gap-3">
                          <div className={`h-6 w-6 rounded-full text-sm font-medium flex items-center justify-center transition-colors ${
                            matchingItem
                              ? matchingItem.current_quantity > 0
                                ? 'bg-green-100 text-green-600'
                                : 'bg-yellow-100 text-yellow-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {matchingItem ? (
                              matchingItem.current_quantity > 0 ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <AlertTriangle className="h-4 w-4" />
                              )
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                              {ingredient}
                            </span>
                            {matchingItem && (
                              <div className="text-xs text-gray-500">
                                Available: {matchingItem.current_quantity} {matchingItem.unit}
                              </div>
                            )}
                          </div>
                          {matchingItem && matchingItem.current_quantity > 0 ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={matchingItem.current_quantity}
                                value={usedIngredients[matchingItem.id] || 0}
                                onChange={(e) => {
                                  const value = Math.min(
                                    Math.max(0, Number(e.target.value)),
                                    matchingItem.current_quantity
                                  );
                                  setUsedIngredients(prev => ({
                                    ...prev,
                                    [matchingItem.id]: value
                                  }));
                                }}
                                className="w-20 text-sm"
                              />
                              <span className="text-sm text-gray-500">
                                {matchingItem.unit}
                              </span>
                            </div>
                          ) : productInfo ? (
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdown(ingredient)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                ${productInfo.selected?.price.toFixed(2)}
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              
                              {openDropdown === ingredient && (
                                <div className="absolute z-10 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                                  <div className="p-3 border-b border-gray-100">
                                    <div className="text-sm font-medium text-gray-700">Select Product</div>
                                    <div className="text-xs text-gray-500">Choose from available options</div>
                                  </div>
                                  <div className="max-h-64 overflow-auto">
                                    {productInfo.products.map((product) => (
                                      <label
                                        key={product.id}
                                        className={`flex items-center gap-4 p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                                          productInfo.selected?.id === product.id
                                            ? 'bg-blue-50'
                                            : ''
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`product-${ingredient}`}
                                          checked={productInfo.selected?.id === product.id}
                                          onChange={() => {
                                            handleProductSelect(ingredient, product);
                                            setOpenDropdown(null);
                                          }}
                                          className="sr-only"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm">{product.name}</div>
                                          <div className="text-xs text-gray-500">
                                            {[product.brand, product.size].filter(Boolean).join(' • ')}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="font-medium text-blue-600">
                                            ${product.price.toFixed(2)}
                                          </div>
                                          <a
                                            href={`https://www.walmart.com/search?q=${encodeURIComponent(product.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-gray-600"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {recipe.equipment && recipe.equipment.length > 0 && (
                <div className="bg-card rounded-xl p-6">
                  <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <Utensils className="h-5 w-5 text-primary" />
                    Equipment Needed
                  </div>
                  <ul className="space-y-2">
                    {recipe.equipment.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-muted-foreground group"
                      >
                        <span className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-card rounded-xl p-6">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <ChefHat className="h-5 w-5 text-primary" />
                  Instructions
                </div>
                <div className="space-y-3">
                  {recipe.instructions && recipe.instructions.map((instruction, index) => (
                    <div
                      key={index}
                      className="rounded-lg overflow-hidden transition-all duration-200 hover:bg-accent"
                    >
                      <button
                        onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                        className="w-full px-4 py-3 flex items-start gap-3 text-left"
                      >
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className={expandedStep === index ? '' : 'line-clamp-2'}>
                            {instruction}
                          </p>
                        </div>
                        <div className="flex-shrink-0 mt-1">
                          {expandedStep === index ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}