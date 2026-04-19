import mongoose, { Document, Schema } from 'mongoose';

export interface ITrainStop {
  station: mongoose.Types.ObjectId;
  arrivalTime?: string;
  departureTime?: string;
  day: number;
  distance?: number;
}

export interface ITrainDoc extends Document {
  number: string;
  name: string;
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  schedule: ITrainStop[];
  runningDays: number[];
}

const TrainStopSchema = new Schema<ITrainStop>({
  station: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
  arrivalTime: { type: String },
  departureTime: { type: String },
  day: { type: Number, default: 1 },
  distance: { type: Number },
});

const TrainSchema = new Schema<ITrainDoc>({
  number: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  from: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
  schedule: [TrainStopSchema],
  runningDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
});

TrainSchema.index({ number: 1 });
TrainSchema.index({ name: 'text', number: 'text' });

export const Train = mongoose.model<ITrainDoc>('Train', TrainSchema);
