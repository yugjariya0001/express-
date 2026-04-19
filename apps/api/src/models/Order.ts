import mongoose, { Document, Schema } from 'mongoose';
type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface IOrderItemDoc {
  foodItem: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrderDoc extends Document {
  user: mongoose.Types.ObjectId;
  restaurant: mongoose.Types.ObjectId;
  train: mongoose.Types.ObjectId;
  boardingStation: mongoose.Types.ObjectId;
  deliveryStation: mongoose.Types.ObjectId;
  journeyDate: Date;
  pnr: string;
  items: IOrderItemDoc[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  coupon?: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; timestamp: Date; note?: string }[];
  deliveryTime?: string;
  payment: {
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  specialInstructions?: string;
  createdAt: Date;
}

const ORDER_STATUSES = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

const OrderItemSchema = new Schema<IOrderItemDoc>({
  foodItem: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const OrderSchema = new Schema<IOrderDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    train: { type: Schema.Types.ObjectId, ref: 'Train', required: true },
    boardingStation: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    deliveryStation: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    journeyDate: { type: Date, required: true },
    pnr: { type: String, required: true, trim: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    coupon: { type: String },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    deliveryTime: { type: String },
    payment: {
      method: { type: String, default: 'razorpay' },
      status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
    },
    specialInstructions: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ restaurant: 1, status: 1 });
OrderSchema.index({ pnr: 1 });

export const Order = mongoose.model<IOrderDoc>('Order', OrderSchema);
