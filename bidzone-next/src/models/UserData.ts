import mongoose, { Schema, type Document, type Model } from 'mongoose'

export interface IUserData extends Document {
  userId: string
  cartIds: string[]
  wishlistIds: string[]
  updatedAt: Date
}

const UserDataSchema = new Schema<IUserData>(
  {
    userId: { type: String, required: true, unique: true },
    cartIds: { type: [String], default: [] },
    wishlistIds: { type: [String], default: [] },
  },
  { timestamps: true },
)

export const UserDataModel: Model<IUserData> =
  (mongoose.models.UserData as Model<IUserData>) ??
  mongoose.model<IUserData>('UserData', UserDataSchema)
