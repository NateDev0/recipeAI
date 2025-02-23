import { z } from 'zod';

const ProductSchema = z.object({
  _id: z.string(),
  product_name: z.string().nullable(),
  generic_name: z.string().nullable(),
  image_url: z.string().nullable(),
  image_small_url: z.string().nullable(),
  image_front_url: z.string().nullable(),
  image_front_small_url: z.string().nullable(),
  categories: z.string().nullable(),
  brands: z.string().nullable(),
  quantity: z.string().nullable(),
  ingredients_text: z.string().nullable(),
});

export type Product = z.infer<typeof ProductSchema>;

const BASE_URL = 'https://world.openfoodfacts.org';

// Add debounce to prevent too many requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // ms

export async function searchFoods(query: string): Promise<Product[]> {
  if (!query.trim()) return [];

  // Rate limiting
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    return [];
  }
  lastRequestTime = now;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=true&page_size=25`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Recipe AI - https://recipe-ai.app',
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      return [];
    }

    // Filter and transform the products
    return data.products
      .filter((product: any) => 
        // Only include products with at least a name and either a generic name or brand
        product.product_name &&
        (product.generic_name || product.brands)
      )
      .map((product: any) => ({
        _id: product._id,
        product_name: product.product_name,
        generic_name: product.generic_name,
        // Prefer smaller images for faster loading
        image_url: product.image_front_small_url || product.image_small_url || product.image_front_url || product.image_url,
        image_small_url: product.image_small_url,
        image_front_url: product.image_front_url,
        image_front_small_url: product.image_front_small_url,
        categories: product.categories,
        brands: product.brands,
        quantity: product.quantity,
        ingredients_text: product.ingredients_text,
      }))
      .slice(0, 10); // Limit to 10 results for better performance
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/v2/product/${barcode}`, {
      headers: {
        'User-Agent': 'Recipe AI - https://recipe-ai.app',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.product) return null;

    return {
      _id: data.product._id || barcode,
      product_name: data.product.product_name,
      generic_name: data.product.generic_name,
      image_url: data.product.image_front_small_url || data.product.image_small_url || data.product.image_front_url || data.product.image_url,
      image_small_url: data.product.image_small_url,
      image_front_url: data.product.image_front_url,
      image_front_small_url: data.product.image_front_small_url,
      categories: data.product.categories,
      brands: data.product.brands,
      quantity: data.product.quantity,
      ingredients_text: data.product.ingredients_text,
    };
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }
}