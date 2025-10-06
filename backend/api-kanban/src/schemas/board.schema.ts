import { Schema, Document, Types } from 'mongoose';
export interface Board extends Document {
  name: string; owner: string; createdAt: Date;
}
export const BoardSchema = new Schema<Board>({
  name: { type: String, required: true },
  owner: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
