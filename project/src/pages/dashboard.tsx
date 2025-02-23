import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChefHat, Sparkles, ArrowRight, AlertTriangle, BookOpen, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth-context';
import { format } from 'date-fns';
import { SavedRecipesModal } from '../components/ui/saved-recipes-modal';

interface ExpiredFood {
  id: string;
  name: string;
  expiration_date: string;
  quantity: number;
  unit: string;
}

interface SavedRecipe {
  id: string;
  recipe_id: string;
  recipe_title: string;
  times_cooked: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [expiredFoods, setExpiredFoods] = useState<ExpiredFood[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [moneySaved, setMoneySaved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpiredFoods, setShowExpiredFoods] = useState(false);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch expired foods
      const today = new Date().toISOString().split('T')[0];
      const { data: expiredData, error: expiredError } = await supabase
        .from('food_items')
        .select('id, name, expiration_date, quantity, unit')
        .eq('user_id', user?.id)
        .lt('expiration_date', today)
        .order('expiration_date', { ascending: false });

      if (expiredError) throw expiredError;

      // Fetch saved recipes
      const { data: recipesData, error: recipesError } = await supabase
        .from('saved_recipes')
        .select('id, recipe_id, times_cooked, recipes(title)')
        .eq('user_id', user?.id);

      if (recipesError) throw recipesError;

      // Calculate money saved (based on recipe costs and times cooked)
      const averageMealCost = 15; // Average cost of a meal if bought outside
      const totalTimesCookedAtHome = recipesData?.reduce((sum, recipe) => sum + (recipe.times_cooked || 0), 0) || 0;
      const estimatedSavings = totalTimesCookedAtHome * averageMealCost * 0.5; // Assume 50% savings per meal

      setExpiredFoods(expiredData || []);
      setSavedRecipes(recipesData?.map(recipe => ({
        ...recipe,
        recipe_title: recipe.recipes?.title || 'Unknown Recipe'
      })) || []);
      setMoneySaved(estimatedSavings);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
            Recipe AI
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your AI-powered kitchen assistant that helps you discover, create, and perfect recipes
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 rounded-lg animate-pulse">
              <div className="h-12 w-12 rounded-full bg-primary/10 mb-4"></div>
              <div className="h-6 w-3/4 bg-primary/10 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-primary/10 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Expired Foods Card */}
          <div className="glass-card p-6 rounded-lg space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Expired Foods</h3>
              <p className="text-2xl font-bold text-red-600">
                {expiredFoods.length} items expired
              </p>
              {expiredFoods.length > 0 && (
                <button
                  onClick={() => setShowExpiredFoods(!showExpiredFoods)}
                  className="flex items-center text-sm text-red-600 hover:text-red-700"
                >
                  {showExpiredFoods ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide expired items
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show expired items
                    </>
                  )}
                </button>
              )}
              {showExpiredFoods && expiredFoods.length > 0 && (
                <div className="mt-4 space-y-2">
                  {expiredFoods.map((food) => (
                    <div key={food.id} className="bg-red-50 p-3 rounded-lg">
                      <div className="font-medium">{food.name}</div>
                      <div className="text-sm text-red-600">
                        Expired on {format(new Date(food.expiration_date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {food.quantity} {food.unit} remaining
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Saved Recipes Card */}
          <div className="glass-card p-6 rounded-lg space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Recipe Collection</h3>
              <p className="text-2xl font-bold">
                {savedRecipes.length} recipes saved
              </p>
              <p className="text-muted-foreground">
                Total times cooked: {savedRecipes.reduce((sum, recipe) => sum + (recipe.times_cooked || 0), 0)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavedRecipes(true)}
                className="mt-2"
              >
                View Collection
              </Button>
            </div>
          </div>

          {/* Money Saved Card */}
          <div className="glass-card p-6 rounded-lg space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Estimated Savings</h3>
              <p className="text-2xl font-bold text-green-600">
                ${moneySaved.toFixed(2)}
              </p>
              <p className="text-muted-foreground">
                Lifetime savings from cooking at home
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-lg overflow-hidden">
        <div className="p-8 sm:p-10">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-foreground">
              Start Creating with AI
            </h2>
            <p className="mt-4 text-muted-foreground">
              Ready to explore the future of cooking? Let our AI help you create
              delicious recipes tailored to your taste.
            </p>
            <div className="mt-8">
              <Link to="/recipes">
                <Button size="lg" className="group">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showSavedRecipes && (
        <SavedRecipesModal onClose={() => setShowSavedRecipes(false)} />
      )}
    </div>
  );
}