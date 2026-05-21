import mongoose, { Schema, type Model } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ITask = {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  assigneeId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

const TaskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true, maxlength: 2000 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], required: true, default: 'medium' },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], required: true, default: 'todo' },
    dueDate: { type: Date, required: false },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Task =
  (mongoose.models.Task as Model<ITask> | undefined) ?? mongoose.model<ITask>('Task', TaskSchema);

