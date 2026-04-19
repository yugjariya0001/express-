'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Star, Clock, MapPin, Leaf, ChevronRight } from 'lucide-react';

interface Restaurant {
  _id: string;
  name: string;
  cuisine: string[];
  rating: number;
  totalRatings: number;
  image?: string;
  isOpen: boolean;
  stations: { _id: string; code: string; name: string; city: string }[];
  commissionRate?: number;
}

export default function RestaurantsPage() {
  const searchParams = useSearchParams();
  const station = searchParams.get('station');
  const trainId = searchParams.get('trainId');
  const pnr = searchParams.get('pnr');

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisineFilter, setCuisineFilter] = useState<string>('');
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const params = new URLSearchParams();
        if (station) params.set('station', station);
        if (cuisineFilter) params.set('cuisine', cuisineFilter);
        const { data } = await api.get(`/restaurants?${params}`);
        setRestaurants(data.data.restaurants);
      } catch {
        console.error('Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [station, cuisineFilter]);

  const allCuisines = [...new Set(restaurants.flatMap((r) => r.cuisine))].sort();

  const filtered = restaurants
    .filter((r) => (vegOnly ? r.cuisine.some((c) => c.toLowerCase().includes('veg')) : true))
    .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Restaurants</h1>
        {station && (
          <p className="text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4" /> Delivering at your selected station
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="input-field w-auto"
          value={cuisineFilter}
          onChange={(e) => setCuisineFilter(e.target.value)}
        >
          <option value="">All Cuisines</option>
          {allCuisines.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all ${vegOnly ? 'border-secondary-500 bg-secondary-50 text-secondary-600' : 'border-gray-300 text-gray-600'}`}
        >
          <Leaf className="w-4 h-4" /> Veg Only
        </button>

        <select
          className="input-field w-auto"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rating' | 'name')}
        >
          <option value="rating">Sort: Rating</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Restaurant Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl">No restaurants found</p>
          <p className="text-sm mt-2">Try changing your filters or run the seed script</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => (
            <Link
              key={r._id}
              href={`/restaurants/${r._id}?trainId=${trainId || ''}&station=${station || ''}&pnr=${pnr || ''}`}
              className="card overflow-hidden group"
            >
              {/* Image */}
              <div className="relative h-44 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
                {r.image ? (
                  <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
                )}
                {!r.isOpen && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Currently Closed</span>
                  </div>
                )}
                <span className={`absolute top-3 right-3 badge ${r.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {r.isOpen ? '● Open' : '● Closed'}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-lg leading-tight">{r.name}</h3>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors mt-0.5 flex-shrink-0" />
                </div>
                <p className="text-gray-500 text-sm mb-3">{r.cuisine.join(' • ')}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-yellow-600 font-medium">
                    <Star className="w-4 h-4 fill-yellow-400 stroke-yellow-500" />
                    {r.rating.toFixed(1)} ({r.totalRatings})
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" /> 25-40 min
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
