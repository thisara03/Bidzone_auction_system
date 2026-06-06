'use client'

export type BannerSlotData = {
  imageUrl: string
  href?: string
  title?: string
  subtitle?: string
}

type HomeAdRailProps = {
  side: 'left' | 'right'
  primary?: BannerSlotData | null
  secondary?: BannerSlotData | null
}

function BannerSlot({
  banner,
  size,
}: {
  banner?: BannerSlotData | null
  size?: 'sm'
}) {
  const content = banner?.imageUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.title ?? 'Sponsored'} className="home-ad-rail__img" loading="lazy" decoding="async" />
      {(banner.title || banner.subtitle) && (
        <div className="home-ad-rail__caption">
          {banner.title && <p className="home-ad-rail__caption-title">{banner.title}</p>}
          {banner.subtitle && <p className="home-ad-rail__caption-sub">{banner.subtitle}</p>}
        </div>
      )}
    </>
  ) : (
    <div className="home-ad-rail__placeholder-inner">
      <div className="home-ad-rail__placeholder-icon" aria-hidden>
        <svg width={size === 'sm' ? 20 : 28} height={size === 'sm' ? 20 : 28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {size === 'sm' ? (
            <>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </>
          ) : (
            <>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </>
          )}
        </svg>
      </div>
      <p className="home-ad-rail__placeholder-text">{size === 'sm' ? 'Promote listing' : 'Your ad here'}</p>
      {size !== 'sm' && <p className="home-ad-rail__placeholder-sub">Reach premium bidders</p>}
    </div>
  )

  return (
    <div className={`home-ad-rail__slot${size === 'sm' ? ' home-ad-rail__slot--sm' : ''}`}>
      {banner?.href ? (
        <a href={banner.href} className="home-ad-rail__link" target="_blank" rel="noopener noreferrer sponsored">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  )
}

export function HomeAdRail({ side, primary, secondary }: HomeAdRailProps) {
  return (
    <div className={`home-ad-rail home-ad-rail--${side}`} role="complementary" aria-label="Advertisement">
      <div className="home-ad-rail__label">Sponsored</div>
      <BannerSlot banner={primary} />
      <BannerSlot banner={secondary} size="sm" />
    </div>
  )
}
