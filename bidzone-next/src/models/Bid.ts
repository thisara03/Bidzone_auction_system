import mongoose, { Schema, type Document, type Model } from 'mongoose'

export interface IBid extends Document {
  _id: mongoose.Types.ObjectId
  auctionId: string
  userId: string
  userName: string
  amount: number
  placedAt: Date
}

const BidSchema = new Schema<IBid>(
  {
    auctionId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

BidSchema.index({ auctionId: 1, placedAt: -1 })
BidSchema.index({ userId: 1, placedAt: -1 })

export const BidModel: Model<IBid> =
  (mongoose.models.Bid as Model<IBid>) ?? mongoose.model<IBid>('Bid', BidSchema)
