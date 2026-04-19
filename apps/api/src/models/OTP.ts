import mongoose, { Document, Schema } from 'mongoose';

export interface IOTPDoc extends Document {
  mobile: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
}

const OTPSchema = new Schema<IOTPDoc>({
  mobile: { type: String, required: true, trim: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
});

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTPDoc>('OTP', OTPSchema);
