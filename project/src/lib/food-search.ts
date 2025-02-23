import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  size: z.string().optional(),
  price: z.number(),
  category: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

// Brand and pricing data
const brandData = {
  generic: [
    { name: 'Great Value', priceMultiplier: 0.8 },
    { name: 'Essential Everyday', priceMultiplier: 0.85 },
    { name: 'Market Pantry', priceMultiplier: 0.9 }
  ],
  premium: [
    { name: 'Jif', priceMultiplier: 1.2 },
    { name: 'Skippy', priceMultiplier: 1.15 },
    { name: 'Peter Pan', priceMultiplier: 1.1 },
    { name: "Smucker's", priceMultiplier: 1.25 },
    { name: 'Justin\'s', priceMultiplier: 1.5 }
  ]
};

// Size variants by category
const sizeVariants: Record<string, { sizes: string[]; basePrice: number }> = {
  'peanut butter': {
    sizes: ['16 oz', '28 oz', '40 oz', '64 oz'],
    basePrice: 3.98
  },
  'jelly': {
    sizes: ['13 oz', '20 oz', '32 oz'],
    basePrice: 2.98
  },
  'bread': {
    sizes: ['20 oz', '24 oz', 'Family Size'],
    basePrice: 1.98
  },
  'milk': {
    sizes: ['Half Gallon', '1 Gallon', '2 Gallons'],
    basePrice: 3.48
  },
  'eggs': {
    sizes: ['12 count', '18 count', '24 count'],
    basePrice: 2.98
  },
  default: {
    sizes: ['Standard Size', 'Family Size', 'Party Size'],
    basePrice: 4.99
  }
};

// Category-specific brands
const categoryBrands: Record<string, string[]> = {
  'peanut butter': ['Jif', 'Skippy', 'Peter Pan', "Smucker's", 'Justin\'s'],
  'jelly': ["Smucker's", 'Welch\'s', 'Bonne Maman', 'Polaner'],
  'bread': ['Wonder', 'Nature\'s Own', 'Sara Lee', 'Dave\'s Killer Bread'],
  'milk': ['Horizon', 'Organic Valley', 'Fairlife', 'Lactaid'],
  'eggs': ['Eggland\'s Best', 'Pete and Gerry\'s', 'Vital Farms', 'Happy Eggs']
};

function generateProductId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getRandomPrice(basePrice: number, multiplier: number): number {
  const variance = basePrice * 0.1;
  const randomVariance = (Math.random() * variance * 2) - variance;
  return Number((basePrice * multiplier + randomVariance).toFixed(2));
}

function getCategoryInfo(query: string): {
  sizes: string[];
  basePrice: number;
  brands: string[];
} {
  const normalizedQuery = query.toLowerCase();
  const category = Object.keys(sizeVariants).find(cat => normalizedQuery.includes(cat));
  
  return {
    sizes: category ? sizeVariants[category].sizes : sizeVariants.default.sizes,
    basePrice: category ? sizeVariants[category].basePrice : sizeVariants.default.basePrice,
    brands: category ? categoryBrands[category] || [] : []
  };
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];

  try {
    const { sizes, basePrice, brands } = getCategoryInfo(query);
    const products: Product[] = [];

    // Generate generic brand products
    for (const brand of brandData.generic) {
      for (const size of sizes) {
        const name = `${brand.name} ${query}`;
        products.push({
          id: generateProductId(),
          name,
          brand: brand.name,
          size,
          price: getRandomPrice(basePrice, brand.priceMultiplier),
          category: 'Food'
        });
      }
    }

    // Generate category-specific or premium brand products
    const relevantBrands = brands.length > 0 ? brands : brandData.premium.map(b => b.name);
    for (const brandName of relevantBrands) {
      const multiplier = brandData.premium.find(b => b.name === brandName)?.priceMultiplier || 1.2;
      
      for (const size of sizes) {
        const name = `${brandName} ${query}`;
        products.push({
          id: generateProductId(),
          name,
          brand: brandName,
          size,
          price: getRandomPrice(basePrice, multiplier),
          category: 'Food'
        });
      }
    }

    // Sort by price
    return products.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}