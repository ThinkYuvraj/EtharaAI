import mongoose, { Schema, type Model } from 'mongoose';

export type UserRole = 'admin' | 'member';

export type IUser = {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
};

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], required: true, default: 'member' },
  },
  { timestamps: true }
);

export const User =
  (mongoose.models.User as Model<IUser> | undefined) ?? mongoose.model<IUser>('User', UserSchema);

