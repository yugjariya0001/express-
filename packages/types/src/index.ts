// User types
export interface IUser {
  _id: string;
  mobile: string;
  name?: string;
  email?: string;
  role: 'user' | 'restaurant' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// OTP types
export interface IOTPRequest {
  mobile: string;
}

export interface IOTPVerify {
  mobile: string;
  otp: string;
}

// Train types
export interface IStation {
  _id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
}

export interface ITrainStop {
  station: IStation | string;
  arrivalTime?: string;
  departureTime?: string;
  day: number;
  distance?: number;
}

export interface ITrain {
  _id: string;
  number: string;
  name: string;
  from: IStation | string;
  to: IStation | string;
  schedule: ITrainStop[];
  runningDays: number[];
}

// Restaurant types
export interface IRestaurant {
  _id: string;
  name: string;
  owner: IUser | string;
  stations: string[];
  cuisine: string[];
  rating: number;
  totalRatings: number;
  image?: string;
  isOpen: boolean;
  isActive: boolean;
  commissionRate?: number;
}

// Food item types
export interface IFoodItem {
  _id: string;
  restaurant: IRestaurant | string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
}

// Cart types
export interface ICartItem {
  foodItem: IFoodItem;
  quantity: number;
}

// Order types
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface IOrderItem {
  foodItem: IFoodItem | string;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder {
  _id: string;
  user: IUser | string;
  restaurant: IRestaurant | string;
  train: ITrain | string;
  boardingStation: IStation | string;
  deliveryStation: IStation | string;
  journeyDate: string;
  pnr: string;
  items: IOrderItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  coupon?: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; timestamp: string; note?: string }[];
  deliveryTime?: string;
  payment: {
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  specialInstructions?: string;
  createdAt: string;
}

// Coupon types
export interface ICoupon {
  _id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minCartValue: number;
  maxDiscount?: number;
  expiryDate: string;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
}

// Review types
export interface IReview {
  _id: string;
  user: IUser | string;
  restaurant: IRestaurant | string;
  order: IOrder | string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pages: number;
}

// PNR Response
export interface IPNRResponse {
  pnr: string;
  trainNumber: string;
  trainName: string;
  journeyDate: string;
  from: string;
  to: string;
  passengerName: string;
  seatClass: string;
  schedule: ITrainStop[];
}
