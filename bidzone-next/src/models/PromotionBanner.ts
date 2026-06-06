import mongoose, { Schema, type Document, type Model } from 'mongoose'

export type BannerPlacement =
  | 'left_primary'
  | 'left_secondary'
  | 'right_primary'
  | 'right_secondary'

export type BannerStatus = 'draft' | 'active' | 'paused'

export interface IPromotionBanner extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  subtitle: string
  imageUrl: string
  linkUrl: string
  placement: BannerPlacement
  status: BannerStatus
  startsAt: Date
  endsAt: Date
  priority: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const PromotionBannerSchema = new Schema<IPromotionBanner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    imageUrl: { type: String, required: true, trim: true },
    linkUrl: { type: String, default: '', trim: true },
    placement: {
      type: String,
      enum: ['left_primary', 'left_secondary', 'right_primary', 'right_secondary'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused'],
      default: 'draft',
      index: true,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    priority: { type: Number, default: 0 },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true },
)

PromotionBannerSchema.index({ placement: 1, status: 1, startsAt: 1, endsAt: 1 })

export const PromotionBannerModel: Model<IPromotionBanner> =
  (mongoose.models.PromotionBanner as Model<IPromotionBanner>) ??
  mongoose.model<IPromotionBanner>('PromotionBanner', PromotionBannerSchema)
