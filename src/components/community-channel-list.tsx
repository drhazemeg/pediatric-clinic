import type {
  CommunityChannel,
  CommunityLocale,
  CommunityPlatform,
} from '@/lib/web/community-links';

// apps/web/src/components/CommunityChannelList.tsx
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  COMMUNITY_PLATFORM_META,
  getCommunitySections,
} from '@/lib/web/community-links';

const hasHref = (href: string | undefined): href is string =>
  href !== undefined && href !== '';

const ChannelRow = ({
  channel,
  platform,
  variant,
  locale,
}: {
  channel: CommunityChannel;
  platform: CommunityPlatform;
  variant: 'modal' | 'card';
  locale: CommunityLocale;
}) => {
  const isAr = locale === 'ar';
  const meta = COMMUNITY_PLATFORM_META[platform];
  const { iconClass, linkClass } = meta;
  const name = isAr ? channel.nameAr : channel.nameEn;
  const description = isAr ? channel.descriptionAr : channel.descriptionEn;
  const comingSoonLabel = isAr ? 'قريباً' : 'Coming soon';

  const baseClass =
    variant === 'modal'
      ? `w-full flex items-start gap-3 py-3.5 px-4 rounded-xl font-semibold transition-all text-foreground border-2 hover:shadow-sm ${linkClass}`
      : `flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${linkClass}`;

  if (!hasHref(channel.href ?? '')) {
    return (
      <div
        aria-disabled="true"
        className={`${baseClass} cursor-not-allowed border-dashed opacity-75`}
      >
        <span className={`mt-0.5 inline-flex shrink-0 text-2xl ${iconClass}`}>
          <MaterialIcon name={channel.icon} />
        </span>
        <span className="flex-1 text-start">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block font-bold">{name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {comingSoonLabel}
            </span>
          </span>
          <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
            {description}
          </span>
        </span>
      </div>
    );
  }

  return (
    <a
      className={baseClass}
      href={channel.href ?? ''}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className={`mt-0.5 inline-flex shrink-0 text-2xl ${iconClass}`}>
        <MaterialIcon name={channel.icon} />
      </span>
      <span className="flex-1 text-start">
        <span
          className={`block font-bold ${variant === 'card' ? 'text-sm' : ''}`}
        >
          {name}
        </span>
        <span
          className={`mt-0.5 block font-normal text-muted-foreground ${variant === 'card' ? 'text-xs' : 'text-sm'}`}
        >
          {description}
        </span>
      </span>
    </a>
  );
};

export const CommunityChannelList = ({
  variant,
  locale = 'ar',
}: {
  variant: 'modal' | 'card';
  locale?: CommunityLocale;
}) => {
  const sections = getCommunitySections();
  const isAr = locale === 'ar';

  return (
    <div
      className={variant === 'modal' ? 'flex flex-col gap-5' : 'space-y-5'}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {sections.map(({ platform, meta, channels }) => (
        <section className="space-y-2" key={platform}>
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            <span className={`inline-flex text-base ${meta.iconClass}`}>
              <MaterialIcon name={meta.icon} />
            </span>
            <span>{isAr ? meta.labelAr : meta.labelEn}</span>
          </h3>
          <div
            className={
              variant === 'modal' ? 'flex flex-col gap-2' : 'space-y-2'
            }
          >
            {channels.map((channel) => (
              <ChannelRow
                channel={channel}
                key={channel.id}
                locale={locale}
                platform={platform}
                variant={variant}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
