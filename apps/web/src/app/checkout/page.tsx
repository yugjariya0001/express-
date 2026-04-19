'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Minus, Plus, Trash2, Tag, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, updateQty, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();

  const trainId = searchParams.get('trainId');
  const stationId = searchParams.get('station');
  const pnr = searchParams.get('pnr');

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryStationId, setDeliveryStationId] = useState(stationId || '');
  const [pnrInput, setPnrInput] = useState(pnr || '');
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const finalAmount = Math.max(0, total - couponDiscount);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Please Login First</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to checkout</p>
        <Link href="/auth" className="btn-primary inline-block">Login Now</Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some delicious food to your cart</p>
        <Link href="/search" className="btn-primary inline-block">Order Food</Link>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.post('/orders/validate-coupon', { code: couponCode, cartTotal: total });
      setCouponDiscount(data.data.discount);
      setAppliedCoupon(couponCode.toUpperCase());
      toast.success(`Coupon applied! You save ${formatCurrency(data.data.discount)}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Invalid coupon');
    }
  };

  const handleRemoveCoupon = () => {
    setCouponDiscount(0);
    setAppliedCoupon('');
    setCouponCode('');
  };

  const handlePlaceOrder = async () => {
    if (!pnrInput || !/^\d{10}$/.test(pnrInput)) {
      toast.error('Enter a valid 10-digit PNR');
      return;
    }
    if (!deliveryStationId) {
      toast.error('Select a delivery station');
      return;
    }
    if (!trainId) {
      toast.error('Train information missing. Please search again.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        restaurantId: cart.restaurantId,
        trainId,
        boardingStationId: deliveryStationId,
        deliveryStationId,
        journeyDate: new Date().toISOString(),
        pnr: pnrInput,
        items: cart.items.map((i) => ({ foodItemId: i.foodItem._id, quantity: i.quantity })),
        couponCode: appliedCoupon || undefined,
        specialInstructions: specialInstructions || undefined,
        paymentMethod: 'razorpay',
      });

      const orderId = data.data.order._id;
      setPlacedOrderId(orderId);

      // Initiate Razorpay payment
      await handlePayment(orderId, data.data.order.finalAmount);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (orderId: string, amount: number) => {
    setPaymentLoading(true);
    try {
      const { data } = await api.post('/payments/create-order', { orderId });
      const { razorpayOrderId, key, mock } = data.data;

      if (mock) {
        // Mock payment in dev
        await api.post('/payments/verify', {
          razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_sig',
          orderId,
        });
        toast.success('Payment successful! 🎉');
        clearCart();
        router.push(`/orders/${orderId}`);
        return;
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key,
          amount: amount * 100,
          currency: 'INR',
          name: 'Express Tadka',
          description: 'Train Food Order',
          order_id: razorpayOrderId,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId,
              });
              toast.success('Payment successful! 🎉');
              clearCart();
              router.push(`/orders/${orderId}`);
            } catch {
              toast.error('Payment verification failed');
            }
          },
          prefill: { contact: user?.mobile },
          theme: { color: '#f97316' },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
    } catch {
      toast.error('Payment initiation failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Items & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Items */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">🛒 Cart Items</h2>
            <p className="text-sm text-gray-500 mb-3">From: {cart.restaurantName}</p>
            <div className="space-y-3">
              {cart.items.map(({ foodItem, quantity }) => (
                <div key={foodItem._id} className="flex items-center gap-3">
                  <div className={`w-3 h-3 border-2 rounded-sm flex-shrink-0 ${foodItem.isVeg ? 'border-secondary-600' : 'border-red-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full m-0.5 ${foodItem.isVeg ? 'bg-secondary-600' : 'bg-red-500'}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium">{foodItem.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(foodItem._id, quantity - 1)} className="w-7 h-7 border rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-medium">{quantity}</span>
                    <button onClick={() => updateQty(foodItem._id, quantity + 1)} className="w-7 h-7 border rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-semibold text-sm w-16 text-right">₹{foodItem.price * quantity}</span>
                  <button onClick={() => removeItem(foodItem._id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Travel Details */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">🚂 Travel Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PNR Number *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter 10-digit PNR"
                  value={pnrInput}
                  onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Any dietary restrictions or special requests..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4"><Tag className="inline w-5 h-5 mr-1" /> Apply Coupon</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 rounded-xl p-3">
                <span className="text-secondary-600 font-medium">{appliedCoupon} - Saving {formatCurrency(couponDiscount)}</span>
                <button onClick={handleRemoveCoupon} className="text-red-500 text-sm hover:text-red-600">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 uppercase"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <button onClick={handleApplyCoupon} className="btn-outline">Apply</button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">Try: FIRST50, SAVE20, TRAIN100, WELCOME</p>
          </div>
        </div>

        {/* Right - Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-secondary-600">
                  <span>Coupon ({appliedCoupon})</span>
                  <span>- {formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Delivery Fee</span>
                <span className="text-secondary-600 font-medium">FREE</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary-500">{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading || paymentLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading || paymentLoading ? (
                'Processing...'
              ) : (
                <>Pay {formatCurrency(finalAmount)} <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              🔒 Secure payment via Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
