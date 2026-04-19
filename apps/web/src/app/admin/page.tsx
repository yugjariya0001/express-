'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { BarChart3, Users, Store, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatCurrency, formatDate } from '@/lib/utils';

interface Stats {
  totalOrders: number;
  todayOrders: number;
  totalUsers: number;
  totalRestaurants: number;
  activeRestaurants: number;
  totalRevenue: number;
  todayRevenue: number;
}

interface Order {
  _id: string;
  status: string;
  finalAmount: number;
  user: { name?: string; mobile: string };
  restaurant: { name: string };
  createdAt: string;
  pnr: string;
}

interface Restaurant {
  _id: string;
  name: string;
  rating: number;
  isOpen: boolean;
  isActive: boolean;
  commissionRate: number;
  cuisine: string[];
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'restaurants'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const load = async () => {
      try {
        const [statsRes, ordersRes, restsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/orders?limit=20'),
          api.get('/admin/restaurants'),
        ]);
        setStats(statsRes.data.data);
        setOrders(ordersRes.data.data.orders);
        setRestaurants(restsRes.data.data.restaurants);
      } catch { console.error('Failed to load admin data'); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleOrderStatus = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
  };

  const handleToggleRestaurant = async (rest: Restaurant) => {
    await api.put(`/restaurants/${rest._id}`, { isActive: !rest.isActive });
    setRestaurants((prev) => prev.map((r) => r._id === rest._id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleUpdateCommission = async (restId: string, rate: number) => {
    await api.patch(`/admin/commissions/${restId}`, { commissionRate: rate });
    setRestaurants((prev) => prev.map((r) => r._id === restId ? { ...r, commissionRate: rate } : r));
  };

  if (authLoading || loading) return <div className="text-center py-16">Loading admin dashboard...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">🛡️ Admin Dashboard</h1>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: ShoppingBag, label: 'Total Orders', value: stats.totalOrders, sub: `+${stats.todayOrders} today`, color: 'text-primary-500 bg-primary-50' },
            { icon: DollarSign, label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), sub: `${formatCurrency(stats.todayRevenue)} today`, color: 'text-secondary-600 bg-secondary-50' },
            { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'text-blue-600 bg-blue-50' },
            { icon: Store, label: 'Restaurants', value: stats.totalRestaurants, sub: `${stats.activeRestaurants} active`, color: 'text-purple-600 bg-purple-50' },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
              {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['overview', 'orders', 'restaurants'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl font-medium capitalize transition-all ${activeTab === tab ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-bold mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center gap-3 text-sm">
                  <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                  <span className="flex-1 truncate">{order.restaurant?.name}</span>
                  <span className="font-medium">{formatCurrency(order.finalAmount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-4">Top Restaurants</h3>
            <div className="space-y-3">
              {restaurants.slice(0, 5).map((r) => (
                <div key={r._id} className="flex items-center gap-3 text-sm">
                  <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="text-yellow-600">⭐ {r.rating.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Order ID', 'Customer', 'Restaurant', 'Amount', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono">#{order._id.slice(-8)}</td>
                    <td className="px-4 py-3">{order.user?.name || order.user?.mobile}</td>
                    <td className="px-4 py-3">{order.restaurant?.name}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(order.finalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      {order.status === 'placed' && (
                        <button onClick={() => handleOrderStatus(order._id, 'confirmed')} className="text-xs text-primary-500 hover:text-primary-600 font-medium">Confirm</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restaurants Tab */}
      {activeTab === 'restaurants' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Name', 'Cuisine', 'Rating', 'Status', 'Commission %', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {restaurants.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.cuisine?.slice(0, 2).join(', ')}</td>
                    <td className="px-4 py-3">⭐ {r.rating.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="w-16 border rounded px-2 py-1 text-center text-sm"
                        defaultValue={r.commissionRate}
                        onBlur={(e) => handleUpdateCommission(r._id, parseFloat(e.target.value))}
                        min={0}
                        max={30}
                      />
                      <span className="ml-1 text-gray-500">%</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleRestaurant(r)}
                        className={`text-xs font-medium ${r.isActive ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                      >
                        {r.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
