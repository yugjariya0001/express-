import mongoose, { Document, Schema } from 'mongoose';

export interface ICouponDoc extends Document {
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minCartValue: number;
  maxDiscount?: number;
  expiryDate: Date;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
}

const CouponSchema = new Schema<ICouponDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'flat'], required: true },
    value: { type: Number, required: true, min: 0 },
    minCartValue: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Coupon = mongoose.model<ICouponDoc>('Coupon', CouponSchema);
