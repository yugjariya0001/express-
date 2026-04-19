import mongoose, { Document, Schema } from 'mongoose';

export interface IFoodItemDoc extends Document {
  restaurant: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
}

const FoodItemSchema = new Schema<IFoodItemDoc>(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    image: { type: String },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

FoodItemSchema.index({ restaurant: 1 });
FoodItemSchema.index({ name: 'text', category: 'text' });

export const FoodItem = mongoose.model<IFoodItemDoc>('FoodItem', FoodItemSchema);
