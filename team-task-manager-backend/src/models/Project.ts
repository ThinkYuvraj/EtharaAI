import mongoose, { Schema, type Model } from 'mongoose';

export type ProjectMember = {
  userId: mongoose.Types.ObjectId;
  role: 'admin' | 'member';
};

export type IProject = {
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  members: ProjectMember[];
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const ProjectMemberSchema = new Schema<ProjectMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], required: true, default: 'member' },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [ProjectMemberSchema], default: [] },
    archived: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export const Project =
  (mongoose.models.Project as Model<IProject> | undefined) ?? mongoose.model<IProject>('Project', ProjectSchema);

