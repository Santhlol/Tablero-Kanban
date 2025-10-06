import { Schema, Document, Types } from 'mongoose';
export interface Task extends Document {
  boardId: Types.ObjectId; columnId: Types.ObjectId;
  title: string; description?: string; assignee?: string;
  position: number; createdAt: Date; updatedAt: Date;
}
export const TaskSchema = new Schema<Task>({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  columnId:{ type: Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
  title:   { type: String, required: true },
  description: String,
  assignee: String,
  position: { type: Number, required: true, index: true },
  createdAt:{ type: Date, default: Date.now },
  updatedAt:{ type: Date, default: Date.now },
});
TaskSchema.pre('save', function(next){ (this as any).updatedAt = new Date(); next(); });
TaskSchema.pre('findOneAndUpdate', function(next){
  this.set({ updatedAt: new Date() }); next();
});
