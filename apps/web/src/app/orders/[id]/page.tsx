'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { CheckCircle, Circle, Clock, Package, Bike, Home, XCircle } from 'lucide-react';

interface Order {
  _id: string;
  status: string;
  pnr: string;
  finalAmount: number;
  statusHistory: { status: string; timestamp: string; note?: string }[];
  items: { name: string; price: number; quantity: number }[];
  restaurant: { name: string; image?: string };
  train: { name: string; number: string };
  boardingStation: { name: string; code: string };
  deliveryStation: { name: string; code: string };
  createdAt: string;
  deliveryTime?: string;
  payment: { status: string; method: string };
}

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${params.id}`);
        setOrder(data.data.order);
      } catch {
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [params.id]);

  useEffect(() => {
    if (!socket || !order) return;
    socket.emit('track:order', order._id);
    socket.on('order:status', (update: { orderId: string; status: string }) => {
      if (update.orderId === order._id) {
        setOrder((prev) => prev ? { ...prev, status: update.status } : prev);
        toast.success(`Order status: ${update.status.replace(/_/g, ' ')}`);
      }
    });
    return () => { socket.off('order:status'); };
  }, [socket, order?._id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />)}
      </div>
    );
  }

  if (!order) return <div className="text-center py-16">Order not found</div>;

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Track Order</h1>
        <span className={`badge text-sm px-3 py-1 ${
          isCancelled ? 'bg-red-100 text-red-700' :
          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'
        }`}>
          {order.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
      </div>

      {/* Order Info */}
      <div className="card p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-2xl">🍛</div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{order.restaurant.name}</h2>
            <p className="text-gray-500 text-sm">Order #{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-gray-500 text-sm">PNR: {order.pnr}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary-500">₹{order.finalAmount}</p>
            <p className="text-xs text-gray-400">{order.payment.status}</p>
          </div>
        </div>
        <div className="border-t mt-4 pt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>🚂 {order.train.name} ({order.train.number})</span>
          <span className="mx-2">•</span>
          <span>📍 {order.deliveryStation.name} ({order.deliveryStation.code})</span>
        </div>
        {order.deliveryTime && (
          <div className="mt-2 text-sm font-medium text-primary-600">
            ⏱ Estimated delivery: {order.deliveryTime}
          </div>
        )}
      </div>

      {/* Status Timeline */}
      {!isCancelled ? (
        <div className="card p-6 mb-6">
          <h3 className="font-bold mb-6">Order Progress</h3>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-6">
              {STATUS_STEPS.map((step, i) => {
                const isDone = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const StepIcon = step.icon;
                const historyEntry = order.statusHistory.find((h) => h.status === step.key);
                return (
                  <div key={step.key} className="flex items-start gap-4 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                      isDone ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-primary-200 dark:ring-primary-900' : ''}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pt-2">
                      <p className={`font-medium ${isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {historyEntry && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(historyEntry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {historyEntry.note && <span> • {historyEntry.note}</span>}
                        </p>
                      )}
                    </div>
                    {isCurrent && <span className="text-primary-500 text-xs font-medium bg-primary-50 px-2 py-1 rounded-full mt-1.5">Current</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 mb-6 border-red-200 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center gap-3 text-red-600">
            <XCircle className="w-8 h-8" />
            <div>
              <p className="font-bold text-lg">Order Cancelled</p>
              <p className="text-sm text-red-500">
                {order.statusHistory.find((h) => h.status === 'cancelled')?.note || 'Order was cancelled'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">Items Ordered</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{item.name} × {item.quantity}</span>
              <span className="font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary-500">₹{order.finalAmount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
