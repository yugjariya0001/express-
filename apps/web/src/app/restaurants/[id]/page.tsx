'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import { Plus, Minus, ShoppingCart, Star, Leaf, ChevronDown } from 'lucide-react';

interface FoodItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
  restaurant: string;
}

interface Restaurant {
  _id: string;
  name: string;
  cuisine: string[];
  rating: number;
  totalRatings: number;
  image?: string;
  isOpen: boolean;
  stations: { code: string; name: string; city: string }[];
}

export default function RestaurantMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem, updateQty, cart, total, itemCount } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Record<string, FoodItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const trainId = searchParams.get('trainId');
  const station = searchParams.get('station');
  const pnr = searchParams.get('pnr');

  useEffect(() => {
    const load = async () => {
      try {
        const [restRes, menuRes] = await Promise.all([
          api.get(`/restaurants/${params.id}`),
          api.get(`/restaurants/${params.id}/menu`),
        ]);
        setRestaurant(restRes.data.data.restaurant);
        setMenu(menuRes.data.data.menu);
        const cats = Object.keys(menuRes.data.data.menu);
        if (cats.length) setActiveCategory(cats[0]);
      } catch {
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const getItemQty = (itemId: string) => {
    return cart.items.find((i) => i.foodItem._id === itemId)?.quantity || 0;
  };

  const handleAdd = (item: FoodItem) => {
    if (cart.restaurantId && cart.restaurantId !== restaurant?._id) {
      if (!confirm('Your cart has items from another restaurant. Start a new cart?')) return;
    }
    addItem(item, restaurant!._id, restaurant!.name);
    toast.success(`${item.name} added to cart`, { duration: 1500 });
  };

  const handleQtyChange = (itemId: string, delta: number) => {
    const current = getItemQty(itemId);
    updateQty(itemId, current + delta);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!restaurant) return <div className="text-center py-16">Restaurant not found</div>;

  const categories = Object.keys(menu);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32">
      {/* Restaurant Header */}
      <div className="relative h-52 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-gray-800 dark:to-gray-700 rounded-b-3xl overflow-hidden mb-6">
        {restaurant.image ? (
          <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="text-orange-200 text-sm">{restaurant.cuisine.join(' • ')}</p>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
              {restaurant.rating.toFixed(1)} ({restaurant.totalRatings} ratings)
            </span>
            <span className={`badge ${restaurant.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {restaurant.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
      </div>

      {/* Veg filter */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all ${vegOnly ? 'border-secondary-500 bg-secondary-50 text-secondary-600' : 'border-gray-300 text-gray-600'}`}
        >
          <Leaf className="w-4 h-4" /> Veg Only
        </button>
      </div>

      {/* Category Nav */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${activeCategory === cat ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu */}
      <div className="space-y-8">
        {categories.map((cat) => {
          const items = (menu[cat] || []).filter((i) => !vegOnly || i.isVeg);
          if (!items.length) return null;
          return (
            <div key={cat} id={`cat-${cat}`}>
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                {cat}
                <span className="text-sm font-normal text-gray-500">({items.length})</span>
              </h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const qty = getItemQty(item._id);
                  return (
                    <div key={item._id} className="card p-4 flex gap-4">
                      {/* Veg/Non-veg indicator */}
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${item.isVeg ? 'border-secondary-600' : 'border-red-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-secondary-600' : 'bg-red-500'}`} />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                        {item.description && (
                          <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">₹{item.price}</span>
                          {item.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                              <Star className="w-3 h-3 fill-yellow-400" /> {item.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image + Add to cart */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl" />
                        )}
                        {qty === 0 ? (
                          <button
                            onClick={() => handleAdd(item)}
                            disabled={!restaurant.isOpen || !item.isAvailable}
                            className="btn-primary text-sm py-1.5 px-5 disabled:opacity-40"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-primary-500 text-white rounded-xl px-2 py-1">
                            <button onClick={() => handleQtyChange(item._id, -1)} className="w-6 h-6 flex items-center justify-center">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold w-4 text-center">{qty}</span>
                            <button onClick={() => handleQtyChange(item._id, 1)} className="w-6 h-6 flex items-center justify-center">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4 z-40">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => router.push(`/checkout?trainId=${trainId || ''}&station=${station || ''}&pnr=${pnr || ''}`)}
              className="w-full bg-primary-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl hover:bg-primary-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
                <span className="font-semibold">items in cart</span>
              </div>
              <div className="flex items-center gap-2 font-bold">
                ₹{total} <ShoppingCart className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
