import type { BannerStatus, IPromotionBanner } from '@/models/PromotionBanner'

export type BannerDisplayStatus = 'draft' | 'paused' | 'scheduled' | 'live' | 'expired'

export function computeBannerDisplayStatus(
  banner: Pick<IPromotionBanner, 'status' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): BannerDisplayStatus {
  if (banner.status === 'draft') return 'draft'
  if (banner.status === 'paused') return 'paused'
  if (now < banner.startsAt) return 'scheduled'
  if (now > banner.endsAt) return 'expired'
  return 'live'
}

export function isBannerPubliclyVisible(
  banner: Pick<IPromotionBanner, 'status' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): boolean {
  return banner.status === 'active' && now >= banner.startsAt && now <= banner.endsAt
}

export function toPublicBanner(doc: IPromotionBanner) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    subtitle: doc.subtitle,
    imageUrl: doc.imageUrl,
    linkUrl: doc.linkUrl || undefined,
    placement: doc.placement,
    startsAt: doc.startsAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    priority: doc.priority,
  }
}

export function toAdminBanner(doc: IPromotionBanner) {
  const displayStatus = computeBannerDisplayStatus(doc)
  return {
    id: doc._id.toString(),
    title: doc.title,
    subtitle: doc.subtitle,
    imageUrl: doc.imageUrl,
    linkUrl: doc.linkUrl,
    placement: doc.placement,
    status: doc.status as BannerStatus,
    displayStatus,
    startsAt: doc.startsAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    priority: doc.priority,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export const BANNER_PLACEMENT_LABELS: Record<string, string> = {
  left_primary: 'Left rail — main banner',
  left_secondary: 'Left rail — promo slot',
  right_primary: 'Right rail — main banner',
  right_secondary: 'Right rail — promo slot',
}
