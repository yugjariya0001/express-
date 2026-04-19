import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDoc extends Document {
  mobile: string;
  name?: string;
  email?: string;
  role: 'user' | 'restaurant' | 'admin';
  isActive: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    mobile: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, enum: ['user', 'restaurant', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDoc>('User', UserSchema);
