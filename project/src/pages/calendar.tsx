import React, { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks, isSameDay, addDays } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, RotateCw, Save, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';
import type { Recipe } from '../lib/types';
import { RecipeDetail } from '../components/ui/recipe-detail';

interface MealPlan {
  id?: string;
  user_id: string;
  date: string;
  breakfast_recipe_id?: string;
  lunch_recipe_id?: string;
  dinner_recipe_id?: string;
  breakfast_recipe?: Recipe;
  lunch_recipe?: Recipe;
  dinner_recipe?: Recipe;
  is_recurring?: boolean;
  recurrence_days?: number[];
}

interface SavedRecipe extends Recipe {
  user_saved_id?: string;
}

export function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [activeMealSlot, setActiveMealSlot] = useState<{
    date: Date;
    mealType: 'breakfast' | 'lunch' | 'dinner';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);
  
  // Initialize the week dates
  useEffect(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDates(days);
  }, [currentDate]);

  // Fetch meal plans and saved recipes
  useEffect(() => {
    if (user) {
      fetchMealPlans();
      fetchSavedRecipes();
    }
  }, [user, currentDate]);

  const fetchMealPlans = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      // Fetch meal plans for the current week
      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .select(`
          id, user_id, date, 
          breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id,
          is_recurring, recurrence_days
        `)
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);
        
      if (planError) throw planError;
      
      // For each meal plan, fetch the associated recipes
      const plansWithRecipes = await Promise.all((planData || []).map(async (plan) => {
        const recipes: Partial<MealPlan> = {};
        
        if (plan.breakfast_recipe_id) {
          const { data } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', plan.breakfast_recipe_id)
            .single();
          recipes.breakfast_recipe = data;
        }
        
        if (plan.lunch_recipe_id) {
          const { data } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', plan.lunch_recipe_id)
            .single();
          recipes.lunch_recipe = data;
        }
        
        if (plan.dinner_recipe_id) {
          const { data } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', plan.dinner_recipe_id)
            .single();
          recipes.dinner_recipe = data;
        }
        
        return { ...plan, ...recipes };
      }));
      
      // Also fetch any recurring plans that might apply to this week
      const { data: recurringData, error: recurringError } = await supabase
        .from('meal_plans')
        .select(`
          id, user_id, date, 
          breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id,
          is_recurring, recurrence_days
        `)
        .eq('user_id', user.id)
        .eq('is_recurring', true);
        
      if (recurringError) throw recurringError;
      
      // Apply recurring plans to current week where appropriate
      const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const recurringPlansForThisWeek = [];
      
      for (const recurringPlan of (recurringData || [])) {
        if (recurringPlan.recurrence_days && recurringPlan.recurrence_days.includes(currentDayOfWeek)) {
          // Check if we already have a non-recurring plan for this day
          const planDate = new Date(recurringPlan.date);
          const dayOfWeek = planDate.getDay();
          
          // Find the date in the current week that matches this day of week
          const targetDate = weekDates.find(date => date.getDay() === dayOfWeek);
          
          if (targetDate) {
            const targetDateStr = format(targetDate, 'yyyy-MM-dd');
            
            // Only apply recurring if no existing plan for this day
            const existingPlan = plansWithRecipes.find(
              plan => plan.date === targetDateStr
            );
            
            if (!existingPlan) {
              // Add this recurring plan for the current week
              const recurringForThisWeek = {
                ...recurringPlan,
                date: targetDateStr
              };
              
              // Fetch associated recipes
              const recipes: Partial<MealPlan> = {};
              
              if (recurringPlan.breakfast_recipe_id) {
                const { data } = await supabase
                  .from('recipes')
                  .select('*')
                  .eq('id', recurringPlan.breakfast_recipe_id)
                  .single();
                recipes.breakfast_recipe = data;
              }
              
              if (recurringPlan.lunch_recipe_id) {
                const { data } = await supabase
                  .from('recipes')
                  .select('*')
                  .eq('id', recurringPlan.lunch_recipe_id)
                  .single();
                recipes.lunch_recipe = data;
              }
              
              if (recurringPlan.dinner_recipe_id) {
                const { data } = await supabase
                  .from('recipes')
                  .select('*')
                  .eq('id', recurringPlan.dinner_recipe_id)
                  .single();
                recipes.dinner_recipe = data;
              }
              
              recurringPlansForThisWeek.push({ ...recurringForThisWeek, ...recipes });
            }
          }
        }
      }
      
      setMealPlans([...plansWithRecipes, ...recurringPlansForThisWeek]);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      setError('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSavedRecipes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_saved_recipes')
        .select(`
          id,
          recipe:recipe_id (*)
        `)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Handle type conversion safely
      if (data) {
        const formattedRecipes: SavedRecipe[] = [];
        
        for (const item of data) {
          if (item && item.recipe && typeof item.recipe === 'object') {
            // Handle recipe object properly
            formattedRecipes.push({
              ...(item.recipe as unknown as Recipe),
              user_saved_id: item.id
            });
          }
        }
        
        setSavedRecipes(formattedRecipes);
      }
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
      setError('Failed to load your saved recipes');
    }
  };
  
  const navigateWeek = (direction: 'next' | 'prev') => {
    setCurrentDate(date => 
      direction === 'next' ? addWeeks(date, 1) : subWeeks(date, 1)
    );
  };
  
  const getMealPlanForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mealPlans.find(plan => plan.date === dateStr);
  };
  
  const openRecipeSelector = (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setActiveMealSlot({ date, mealType });
    setShowRecipeSelector(true);
  };
  
  const assignRecipeToMealPlan = async (recipe: Recipe) => {
    if (!user || !activeMealSlot) return;
    
    try {
      setLoading(true);
      const dateStr = format(activeMealSlot.date, 'yyyy-MM-dd');
      const mealType = activeMealSlot.mealType;
      
      // Check if a meal plan for this date already exists
      const existingPlan = mealPlans.find(plan => plan.date === dateStr);
      
      if (existingPlan) {
        // Update existing plan
        const updateData: any = {
          [`${mealType}_recipe_id`]: recipe.id
        };
        
        const { error } = await supabase
          .from('meal_plans')
          .update(updateData)
          .eq('id', existingPlan.id);
          
        if (error) throw error;
      } else {
        // Create new plan
        const newPlan: any = {
          user_id: user.id,
          date: dateStr,
          [`${mealType}_recipe_id`]: recipe.id
        };
        
        const { error } = await supabase
          .from('meal_plans')
          .insert(newPlan);
          
        if (error) throw error;
      }
      
      // Refresh meal plans
      await fetchMealPlans();
      setShowRecipeSelector(false);
      setActiveMealSlot(null);
    } catch (error) {
      console.error('Error updating meal plan:', error);
      setError('Failed to update meal plan');
    } finally {
      setLoading(false);
    }
  };
  
  const removeRecipeFromMealPlan = async (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!user) return;
    
    try {
      setLoading(true);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Find the meal plan for this date
      const existingPlan = mealPlans.find(plan => plan.date === dateStr);
      
      if (existingPlan) {
        // Update to remove the recipe
        const updateData: any = {
          [`${mealType}_recipe_id`]: null
        };
        
        const { error } = await supabase
          .from('meal_plans')
          .update(updateData)
          .eq('id', existingPlan.id);
          
        if (error) throw error;
        
        // Refresh meal plans
        await fetchMealPlans();
      }
    } catch (error) {
      console.error('Error removing recipe from meal plan:', error);
      setError('Failed to update meal plan');
    } finally {
      setLoading(false);
    }
  };
  
  const createRecurringMealPlan = async () => {
    if (!user || !activeMealSlot) return;
    
    try {
      setLoading(true);
      const dayOfWeek = activeMealSlot.date.getDay();
      const dateStr = format(activeMealSlot.date, 'yyyy-MM-dd');
      
      // Find the current meal plan
      const currentPlan = mealPlans.find(plan => plan.date === dateStr);
      
      if (!currentPlan) {
        setError('No meal plan found for this day');
        return;
      }
      
      // Create a recurring plan based on the current plan
      const recurringPlan = {
        user_id: user.id,
        date: dateStr,
        breakfast_recipe_id: currentPlan.breakfast_recipe_id,
        lunch_recipe_id: currentPlan.lunch_recipe_id,
        dinner_recipe_id: currentPlan.dinner_recipe_id,
        is_recurring: true,
        recurrence_days: [dayOfWeek]
      };
      
      const { error } = await supabase
        .from('meal_plans')
        .insert(recurringPlan);
        
      if (error) throw error;
      
      // Refresh meal plans
      await fetchMealPlans();
      setIsCreatingRecurring(false);
    } catch (error) {
      console.error('Error creating recurring meal plan:', error);
      setError('Failed to create recurring meal plan');
    } finally {
      setLoading(false);
    }
  };
  
  const renderMealSlot = (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const mealPlan = getMealPlanForDate(date);
    let recipe;
    
    switch (mealType) {
      case 'breakfast':
        recipe = mealPlan?.breakfast_recipe;
        break;
      case 'lunch':
        recipe = mealPlan?.lunch_recipe;
        break;
      case 'dinner':
        recipe = mealPlan?.dinner_recipe;
        break;
    }
    
    if (recipe) {
      return (
        <div className="p-2 bg-white rounded-md shadow-sm border border-gray-200 text-sm">
          <div className="font-medium text-gray-900 truncate">{recipe.title}</div>
          <div className="mt-1 flex items-center justify-between">
            <button 
              className="text-xs text-gray-500 hover:text-primary"
              onClick={() => setSelectedRecipe(recipe)}
            >
              View Recipe
            </button>
            <button
              className="text-xs text-red-500 hover:text-red-700"
              onClick={() => removeRecipeFromMealPlan(date, mealType)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <button
        className="p-2 border border-dashed border-gray-300 rounded-md text-gray-500 text-sm hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors w-full h-full min-h-[50px] flex items-center justify-center"
        onClick={() => openRecipeSelector(date, mealType)}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add {mealType}
      </button>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Meal Planner
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Plan your meals for the week and create recurring meal plans
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:ml-4 md:mt-0">
          <Button
            variant="outline"
            onClick={() => navigateWeek('prev')}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Week
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => navigateWeek('next')}
            className="gap-2"
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDates.map((date) => (
            <div 
              key={date.toString()} 
              className={`py-2 text-center border-r last:border-r-0 ${
                isSameDay(date, new Date()) ? 'bg-primary/10' : ''
              }`}
            >
              <div className="text-sm font-medium">
                {format(date, 'EEEE')}
              </div>
              <div className={`text-2xl font-bold ${
                isSameDay(date, new Date()) ? 'text-primary' : ''
              }`}>
                {format(date, 'd')}
              </div>
              <div className="text-xs text-gray-500">
                {format(date, 'MMM yyyy')}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 divide-y">
          {/* Breakfast row */}
          <div className="grid grid-cols-7">
            {weekDates.map((date) => (
              <div key={`breakfast-${date.toString()}`} className="p-2 border-r last:border-r-0">
                <div className="text-xs font-medium text-gray-500 mb-1">Breakfast</div>
                {renderMealSlot(date, 'breakfast')}
              </div>
            ))}
          </div>
          
          {/* Lunch row */}
          <div className="grid grid-cols-7">
            {weekDates.map((date) => (
              <div key={`lunch-${date.toString()}`} className="p-2 border-r last:border-r-0">
                <div className="text-xs font-medium text-gray-500 mb-1">Lunch</div>
                {renderMealSlot(date, 'lunch')}
              </div>
            ))}
          </div>
          
          {/* Dinner row */}
          <div className="grid grid-cols-7">
            {weekDates.map((date) => (
              <div key={`dinner-${date.toString()}`} className="p-2 border-r last:border-r-0">
                <div className="text-xs font-medium text-gray-500 mb-1">Dinner</div>
                {renderMealSlot(date, 'dinner')}
                
                {/* Make Recurring button */}
                {getMealPlanForDate(date) && (
                  <div className="mt-2 flex justify-center">
                    <button
                      className="text-xs flex items-center text-primary hover:underline"
                      onClick={() => {
                        setActiveMealSlot({
                          date,
                          mealType: 'dinner' // Just to have something set, not used for recurring
                        });
                        setIsCreatingRecurring(true);
                      }}
                    >
                      <RotateCw className="h-3 w-3 mr-1" />
                      Make Recurring
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Select a Recipe for {activeMealSlot?.mealType ? 
                  activeMealSlot.mealType.charAt(0).toUpperCase() + activeMealSlot.mealType.slice(1) : 
                  'Meal'}
              </h3>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowRecipeSelector(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {savedRecipes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  You don't have any saved recipes yet. Go to the Discover tab to find and save recipes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="border rounded-md p-4 hover:shadow-md cursor-pointer transition-shadow"
                    onClick={() => assignRecipeToMealPlan(recipe)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-md overflow-hidden">
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-medium">{recipe.title}</h4>
                        <p className="text-sm text-gray-500">
                          {recipe.description.length > 50
                            ? `${recipe.description.substring(0, 50)}...`
                            : recipe.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Create Recurring Plan Confirmation */}
      {isCreatingRecurring && activeMealSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Create Recurring Meal Plan</h3>
            <p className="text-gray-600 mb-4">
              This will create a recurring meal plan for {format(activeMealSlot.date, 'EEEE')}s. 
              The plan will be applied to all future weeks.
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsCreatingRecurring(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createRecurringMealPlan}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Create Recurring Plan
              </Button>
            </div>
          </div>
        </div>
      )}
      
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