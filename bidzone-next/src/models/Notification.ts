import mongoose, { Schema, type Document, type Model } from 'mongoose'

export type NotificationKind = 'outbid' | 'bid_placed' | 'won' | 'payment' | 'lot_broadcast'

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  userId: string
  kind: NotificationKind
  read: boolean
  meta: {
    itemKey?: string
    bidAmount?: number
    rawItem?: string
    paymentTotal?: number
  }
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    kind: {
      type: String,
      enum: ['outbid', 'bid_placed', 'won', 'payment', 'lot_broadcast'],
      required: true,
    },
    read: { type: Boolean, default: false },
    meta: {
      itemKey: { type: String },
      bidAmount: { type: Number },
      rawItem: { type: String },
      paymentTotal: { type: Number },
    },
  },
  { timestamps: true },
)

NotificationSchema.index({ userId: 1, createdAt: -1 })

export const NotificationModel: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ??
  mongoose.model<INotification>('Notification', NotificationSchema)
