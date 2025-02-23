import React, { useState, useEffect, useRef } from 'react';
import { Command, ExternalLink } from 'lucide-react';
import { Input } from './input';
import { searchProducts, type Product } from '../../lib/food-search';

interface FoodSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function FoodSearch({ value, onChange }: FoodSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number>();

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const fetchProducts = async () => {
      if (!value.trim()) {
        setProducts([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const results = await searchProducts(value);
        setProducts(results);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to fetch products. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    searchTimeoutRef.current = window.setTimeout(fetchProducts, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getWalmartSearchUrl = (productName: string) => {
    return `https://www.walmart.com/search?q=${encodeURIComponent(productName)}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a food item..."
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Command className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {loading ? (
              <li className="px-4 py-2 text-sm text-gray-500">Loading...</li>
            ) : error ? (
              <li className="px-4 py-2 text-sm text-red-500">{error}</li>
            ) : products.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-500">
                {value.trim() ? 'No results found' : 'Start typing to search'}
              </li>
            ) : (
              products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      onChange(product.name);
                      setIsOpen(false);
                    }}
                  >
                    <div className="font-medium">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {[
                        product.brand,
                        product.size,
                        product.price && `$${product.price.toFixed(2)}`
                      ].filter(Boolean).join(' • ')}
                    </div>
                  </button>
                  <a
                    href={getWalmartSearchUrl(product.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}