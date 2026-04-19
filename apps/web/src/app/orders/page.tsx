'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatDate, formatCurrency } from '@/lib/utils';
import { ChevronRight, ShoppingBag } from 'lucide-react';

interface Order {
  _id: string;
  status: string;
  finalAmount: number;
  items: { name: string; quantity: number }[];
  restaurant: { name: string };
  createdAt: string;
  pnr: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const params = statusFilter ? `?status=${statusFilter}` : '';
        const { data } = await api.get(`/orders${params}`);
        setOrders(data.data.orders);
      } catch {
        console.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, statusFilter]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-4">Please login to view orders</h2>
        <Link href="/auth" className="btn-primary inline-block">Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {['', 'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
              statusFilter === s ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {s ? ORDER_STATUS_LABELS[s] : 'All Orders'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-500">No orders yet</h3>
          <p className="text-gray-400 mb-6">Start by searching for your train</p>
          <Link href="/search" className="btn-primary inline-block">Order Now</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="card p-5 flex items-center gap-4 hover:border-primary-300 border-2 border-transparent transition-all">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                🍛
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold truncate">{order.restaurant?.name}</h3>
                  <span className={`badge text-xs ${ORDER_STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-gray-500 text-sm truncate">
                  {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(order.createdAt)} • PNR: {order.pnr}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-primary-500">{formatCurrency(order.finalAmount)}</p>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
