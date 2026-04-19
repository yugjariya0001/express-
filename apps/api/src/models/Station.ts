import mongoose, { Document, Schema } from 'mongoose';

export interface IStationDoc extends Document {
  code: string;
  name: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
}

const StationSchema = new Schema<IStationDoc>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  lat: { type: Number },
  lng: { type: Number },
});

StationSchema.index({ code: 1 });
StationSchema.index({ name: 'text', city: 'text' });

export const Station = mongoose.model<IStationDoc>('Station', StationSchema);
