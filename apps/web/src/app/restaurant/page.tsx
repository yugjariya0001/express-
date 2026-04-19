'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import toast from 'react-hot-toast';
import { ToggleLeft, ToggleRight, Plus, Edit } from 'lucide-react';

interface OrderItem { name: string; quantity: number; price: number }
interface Order {
  _id: string;
  status: string;
  items: OrderItem[];
  finalAmount: number;
  pnr: string;
  user: { name?: string; mobile: string };
  boardingStation: { name: string; code: string };
  createdAt: string;
}
interface FoodItem {
  _id: string; name: string; price: number; isVeg: boolean; isAvailable: boolean; category: string;
}
interface Restaurant {
  _id: string; name: string; isOpen: boolean; rating: number; totalRatings: number;
}

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Main Course', isVeg: true, description: '' });
  const [showNewItem, setShowNewItem] = useState(false);

  const loadDashboard = async () => {
    try {
      const [restRes, ordersRes] = await Promise.all([
        api.get('/restaurants?limit=1'),
        api.get('/orders/restaurant/placeholder'),
      ]);
      // Get restaurant owned by current user via admin endpoint would need a dedicated endpoint
      // For now we use the first restaurant returned for this user
      const allRest = restRes.data.data.restaurants;
      setRestaurant(allRest[0] || null);
      if (allRest[0]) {
        const [menuRes, myOrdersRes] = await Promise.all([
          api.get(`/restaurants/${allRest[0]._id}/menu`),
          api.get(`/orders/restaurant/${allRest[0]._id}?status=placed`),
        ]);
        setMenuItems(menuRes.data.data.items || []);
        setOrders(myOrdersRes.data.data.orders || []);
      }
    } catch {
      console.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadDashboard(); }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:new', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      toast('New order received! 🍛', { icon: '🔔', duration: 5000 });
    });
    return () => { socket.off('order:new'); };
  }, [socket]);

  const toggleRestaurantOpen = async () => {
    if (!restaurant) return;
    try {
      const { data } = await api.put(`/restaurants/${restaurant._id}`, { isOpen: !restaurant.isOpen });
      setRestaurant(data.data.restaurant);
      toast.success(data.data.restaurant.isOpen ? 'Restaurant is now Open' : 'Restaurant is now Closed');
    } catch { toast.error('Failed to update status'); }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
      toast.success(`Order ${status}`);
    } catch { toast.error('Failed to update order'); }
  };

  const handleAddFoodItem = async () => {
    if (!restaurant || !newItem.name || !newItem.price) { toast.error('Fill required fields'); return; }
    try {
      const { data } = await api.post(`/restaurants/${restaurant._id}/food-items`, {
        ...newItem, price: parseFloat(newItem.price), isAvailable: true,
      });
      setMenuItems((prev) => [...prev, data.data.foodItem]);
      setNewItem({ name: '', price: '', category: 'Main Course', isVeg: true, description: '' });
      setShowNewItem(false);
      toast.success('Item added!');
    } catch { toast.error('Failed to add item'); }
  };

  const toggleItemAvailability = async (item: FoodItem) => {
    if (!restaurant) return;
    try {
      await api.put(`/restaurants/${restaurant._id}/food-items/${item._id}`, { isAvailable: !item.isAvailable });
      setMenuItems((prev) => prev.map((i) => i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i));
    } catch { toast.error('Failed to update item'); }
  };

  if (!user || (user.role !== 'restaurant' && user.role !== 'admin')) {
    return <div className="text-center py-16 text-gray-500">Access denied. Restaurant owners only.</div>;
  }

  if (loading) return <div className="text-center py-16">Loading dashboard...</div>;
  if (!restaurant) return <div className="text-center py-16 text-gray-500">No restaurant found for your account. Contact admin.</div>;

  const pendingOrders = orders.filter((o) => ['placed', 'confirmed'].includes(o.status));
  const todayRevenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.finalAmount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="text-gray-500">⭐ {restaurant.rating.toFixed(1)} ({restaurant.totalRatings} ratings)</p>
        </div>
        <button onClick={toggleRestaurantOpen} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${restaurant.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {restaurant.isOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          {restaurant.isOpen ? 'Open' : 'Closed'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'New Orders', value: pendingOrders.length, color: 'bg-primary-50 text-primary-600' },
          { label: "Today's Revenue", value: `₹${todayRevenue}`, color: 'bg-secondary-50 text-secondary-600' },
          { label: 'Total Items', value: menuItems.length, color: 'bg-blue-50 text-blue-600' },
        ].map((s) => (
          <div key={s.label} className={`card p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['orders', 'menu'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl font-medium capitalize transition-all ${activeTab === tab ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {tab === 'orders' ? `Orders (${pendingOrders.length})` : 'Menu'}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No orders yet today</div>
          ) : orders.map((order) => (
            <div key={order._id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold">#{order._id.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{order.user.name || order.user.mobile} • PNR: {order.pnr}</p>
                  <p className="text-sm text-gray-500">📍 {order.boardingStation?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-500">₹{order.finalAmount}</p>
                  <span className={`badge text-xs ${order.status === 'placed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
              </div>
              {order.status === 'placed' && (
                <div className="flex gap-2">
                  <button onClick={() => handleOrderStatus(order._id, 'confirmed')} className="btn-secondary text-sm py-1.5 px-4">✓ Accept</button>
                  <button onClick={() => handleOrderStatus(order._id, 'cancelled')} className="border border-red-300 text-red-500 text-sm py-1.5 px-4 rounded-xl hover:bg-red-50">✗ Reject</button>
                </div>
              )}
              {order.status === 'confirmed' && (
                <button onClick={() => handleOrderStatus(order._id, 'preparing')} className="btn-primary text-sm py-1.5 px-4">Start Preparing</button>
              )}
              {order.status === 'preparing' && (
                <button onClick={() => handleOrderStatus(order._id, 'out_for_delivery')} className="btn-primary text-sm py-1.5 px-4">Mark Out for Delivery</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Menu Items ({menuItems.length})</h2>
            <button onClick={() => setShowNewItem(!showNewItem)} className="btn-primary text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {showNewItem && (
            <div className="card p-4 mb-4 border-primary-200 border-2">
              <h3 className="font-bold mb-3">New Food Item</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className="input-field" placeholder="Item name *" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                <input className="input-field" placeholder="Price ₹ *" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
                <input className="input-field" placeholder="Category" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
                <select className="input-field" value={newItem.isVeg ? 'true' : 'false'} onChange={(e) => setNewItem({ ...newItem, isVeg: e.target.value === 'true' })}>
                  <option value="true">🟢 Veg</option>
                  <option value="false">🔴 Non-Veg</option>
                </select>
              </div>
              <input className="input-field mb-3" placeholder="Description (optional)" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={handleAddFoodItem} className="btn-primary text-sm">Add Item</button>
                <button onClick={() => setShowNewItem(false)} className="btn-outline text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {menuItems.map((item) => (
              <div key={item._id} className="card p-4 flex items-center gap-3">
                <div className={`w-3 h-3 border-2 rounded-sm flex-shrink-0 ${item.isVeg ? 'border-secondary-600' : 'border-red-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full m-0.5 ${item.isVeg ? 'bg-secondary-600' : 'bg-red-500'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.category} • ₹{item.price}</p>
                </div>
                <button
                  onClick={() => toggleItemAvailability(item)}
                  className={`text-sm px-3 py-1 rounded-lg font-medium ${item.isAvailable ? 'bg-secondary-100 text-secondary-600' : 'bg-gray-100 text-gray-500'}`}
                >
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
