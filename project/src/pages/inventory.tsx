import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { FoodSearch } from '../components/ui/food-search';
import { supabase } from '../lib/supabase';
import type { FoodItem, FoodItemInput } from '../lib/types';
import { useAuth } from '../contexts/auth-context';

const CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Other',
];

const UNITS = [
  'pieces',
  'grams',
  'kilograms',
  'milliliters',
  'liters',
  'cups',
  'tablespoons',
  'teaspoons',
  'ounces',
  'pounds',
];

export function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);

  const [formData, setFormData] = useState<FoodItemInput>({
    name: '',
    quantity: 1,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    setError(null);

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('food_items')
          .update(formData)
          .eq('id', editingItem.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('food_items')
          .insert([{ ...formData, user_id: user.id }]);

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
      unit: 'pieces',
      category: 'Other',
      expiration_date: null,
      storage_location: '',
    });
    setEditingItem(null);
    setIsAddingItem(false);
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Inventory
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
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
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
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
        {items.length === 0 ? (
          <div className="p-6">
            <div className="text-center text-gray-500">
              <p>No items in your inventory yet.</p>
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity} {item.unit}
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