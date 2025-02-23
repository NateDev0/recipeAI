import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Edit2, Trash2, Plus, Filter, Beaker } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FoodSearch } from '../components/ui/food-search';
import { supabase } from '../lib/supabase';
import type { FoodItem, FoodItemInput } from '../lib/types';
import { CATEGORIES, UNITS } from '../lib/types';
import { useAuth } from '../contexts/auth-context';

// Common pantry items for development with expiration dates
const DEV_PANTRY_ITEMS = [
  // Dairy products (short shelf life)
  { 
    name: 'Milk', 
    quantity: 1, 
    unit: 'gallons', 
    category: 'Dairy', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 7).toISOString().split('T')[0]
  },
  { 
    name: 'Eggs', 
    quantity: 12, 
    unit: 'pieces', 
    category: 'Dairy', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 21).toISOString().split('T')[0]
  },
  { 
    name: 'Butter', 
    quantity: 2, 
    unit: 'pieces', 
    category: 'Dairy', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 30).toISOString().split('T')[0]
  },
  { 
    name: 'Cheese', 
    quantity: 2, 
    unit: 'pounds', 
    category: 'Dairy', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 14).toISOString().split('T')[0]
  },

  // Produce (very short shelf life)
  { 
    name: 'Tomatoes', 
    quantity: 6, 
    unit: 'pieces', 
    category: 'Produce', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 5).toISOString().split('T')[0]
  },
  { 
    name: 'Carrots', 
    quantity: 1, 
    unit: 'pounds', 
    category: 'Produce', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 14).toISOString().split('T')[0]
  },
  { 
    name: 'Potatoes', 
    quantity: 5, 
    unit: 'pounds', 
    category: 'Produce', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 21).toISOString().split('T')[0]
  },
  { 
    name: 'Onions', 
    quantity: 4, 
    unit: 'pieces', 
    category: 'Produce', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 30).toISOString().split('T')[0]
  },
  { 
    name: 'Garlic', 
    quantity: 2, 
    unit: 'pieces', 
    category: 'Produce', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 90).toISOString().split('T')[0]
  },

  // Meat (short shelf life)
  { 
    name: 'Chicken Breast', 
    quantity: 4, 
    unit: 'pieces', 
    category: 'Meat', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 2).toISOString().split('T')[0]
  },
  { 
    name: 'Ground Beef', 
    quantity: 2, 
    unit: 'pounds', 
    category: 'Meat', 
    storage_location: 'Fridge',
    expiration_date: addDays(new Date(), 3).toISOString().split('T')[0]
  },

  // Pantry items (long shelf life)
  { 
    name: 'Rice', 
    quantity: 5, 
    unit: 'pounds', 
    category: 'Pantry', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 365).toISOString().split('T')[0]
  },
  { 
    name: 'Pasta', 
    quantity: 3, 
    unit: 'pounds', 
    category: 'Pantry', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 365).toISOString().split('T')[0]
  },
  { 
    name: 'Flour', 
    quantity: 5, 
    unit: 'pounds', 
    category: 'Pantry', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 180).toISOString().split('T')[0]
  },
  { 
    name: 'Sugar', 
    quantity: 4, 
    unit: 'pounds', 
    category: 'Pantry', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 720).toISOString().split('T')[0]
  },
  { 
    name: 'Olive Oil', 
    quantity: 1, 
    unit: 'liters', 
    category: 'Pantry', 
    storage_location: 'Pantry',
    expiration_date: addDays(new Date(), 180).toISOString().split('T')[0]
  },

  // Add some expired items for testing
  { 
    name: 'Old Yogurt', 
    quantity: 1, 
    unit: 'pieces', 
    category: 'Dairy', 
    storage_location: 'Fridge',
    expiration_date: subDays(new Date(), 5).toISOString().split('T')[0]
  },
  { 
    name: 'Expired Bread', 
    quantity: 1, 
    unit: 'pieces', 
    category: 'Pantry', 
    storage_location: 'Counter',
    expiration_date: subDays(new Date(), 3).toISOString().split('T')[0]
  },
  { 
    name: 'Old Lettuce', 
    quantity: 1, 
    unit: 'pieces', 
    category: 'Produce', 
    storage_location: 'Fridge',
    expiration_date: subDays(new Date(), 2).toISOString().split('T')[0]
  }
];

export function Pantry() {
  const { user } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingDevItems, setIsAddingDevItems] = useState(false);

  const [formData, setFormData] = useState<FoodItemInput>({
    name: '',
    quantity: 1,
    initial_quantity: 1,
    current_quantity: 1,
    unit: 'pieces',
    category: 'Other',
    expiration_date: null,
    storage_location: '',
  });

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  async function fetchItems() {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setError('Failed to fetch items');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDevItems() {
    if (!user) return;
    
    try {
      setIsAddingDevItems(true);
      setError(null);

      // Clear existing items first
      const { error: deleteError } = await supabase
        .from('food_items')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Add dev items
      const devItems = DEV_PANTRY_ITEMS.map(item => ({
        ...item,
        user_id: user.id,
        initial_quantity: item.quantity,
        current_quantity: item.quantity,
        used_in_recipes: []
      }));

      const { error: insertError } = await supabase
        .from('food_items')
        .insert(devItems);

      if (insertError) throw insertError;

      await fetchItems();
    } catch (err) {
      setError('Failed to add development items');
      console.error('Error:', err);
    } finally {
      setIsAddingDevItems(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    setError(null);

    try {
      const itemData = {
        ...formData,
        initial_quantity: formData.quantity,
        current_quantity: formData.quantity
      };

      if (editingItem) {
        const { error } = await supabase
          .from('food_items')
          .update(itemData)
          .eq('id', editingItem.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('food_items')
          .insert([{ ...itemData, user_id: user.id }]);

        if (error) throw error;
      }

      await fetchItems();
      resetForm();
    } catch (err) {
      setError('Failed to save item');
      console.error('Error:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchItems();
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error:', err);
    }
  }

  function handleEdit(item: FoodItem) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      initial_quantity: item.initial_quantity,
      current_quantity: item.current_quantity,
      unit: item.unit,
      category: item.category,
      expiration_date: item.expiration_date,
      storage_location: item.storage_location,
    });
    setIsAddingItem(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      quantity: 1,
      initial_quantity: 1,
      current_quantity: 1,
      unit: 'pieces',
      category: 'Other',
      expiration_date: null,
      storage_location: '',
    });
    setEditingItem(null);
    setIsAddingItem(false);
  }

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(item => item.category === selectedCategory);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            My Pantry
          </h2>
        </div>
        <div className="mt-4 flex gap-2 md:ml-4 md:mt-0">
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              onClick={handleAddDevItems}
              disabled={isAddingDevItems}
              className="flex items-center gap-2"
            >
              <Beaker className="h-4 w-4" />
              {isAddingDevItems ? 'Adding...' : 'Add Dev Items'}
            </Button>
          )}
          <Button onClick={() => setIsAddingItem(true)} disabled={isAddingItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {isAddingItem && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <FoodSearch
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
                  required
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({
                    ...formData,
                    quantity: Number(e.target.value),
                    initial_quantity: Number(e.target.value),
                    current_quantity: Number(e.target.value)
                  })}
                  required
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
                  required
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expiration" className="block text-sm font-medium text-gray-700">
                  Expiration Date
                </label>
                <Input
                  id="expiration"
                  type="date"
                  value={formData.expiration_date || ''}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Storage Location
                </label>
                <Input
                  id="location"
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  placeholder="e.g., Fridge, Pantry"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-40 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-6">
            <div className="text-center text-gray-500">
              <p>No items in your pantry yet.</p>
              <p className="mt-1">Add some items to get started!</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.current_quantity} / {item.initial_quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.expiration_date
                        ? format(new Date(item.expiration_date), 'MMM d, yyyy')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.storage_location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}