import { Schema, Document, Types } from 'mongoose';
export interface Column extends Document {
  boardId: Types.ObjectId; title: string; position: number; createdAt: Date;
}
export const ColumnSchema = new Schema<Column>({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  title: { type: String, required: true },
  position: { type: Number, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});
