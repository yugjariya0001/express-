import mongoose, { Document, Schema } from 'mongoose';

export interface IRestaurantDoc extends Document {
  name: string;
  owner: mongoose.Types.ObjectId;
  stations: mongoose.Types.ObjectId[];
  cuisine: string[];
  rating: number;
  totalRatings: number;
  image?: string;
  isOpen: boolean;
  isActive: boolean;
  commissionRate: number;
}

const RestaurantSchema = new Schema<IRestaurantDoc>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stations: [{ type: Schema.Types.ObjectId, ref: 'Station' }],
    cuisine: [{ type: String, trim: true }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    image: { type: String },
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    commissionRate: { type: Number, default: 10 },
  },
  { timestamps: true }
);

RestaurantSchema.index({ stations: 1 });
RestaurantSchema.index({ name: 'text' });

export const Restaurant = mongoose.model<IRestaurantDoc>('Restaurant', RestaurantSchema);
