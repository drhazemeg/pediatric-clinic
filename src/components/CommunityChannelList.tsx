// apps/web/src/components/CommunityChannelList.tsx
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import {
	COMMUNITY_PLATFORM_META,
	type CommunityChannel,
	type CommunityLocale,
	type CommunityPlatform,
	getCommunitySections
} from "@/lib/web/community-links";

function ChannelRow({
	channel,
	platform,
	variant,
	locale
}: {
	channel: CommunityChannel;
	platform: CommunityPlatform;
	variant: "modal" | "card";
	locale: CommunityLocale;
}) {
	const isAr = locale === "ar";
	const meta = COMMUNITY_PLATFORM_META[platform];
	const name = isAr ? channel.nameAr : channel.nameEn;
	const description = isAr ? channel.descriptionAr : channel.descriptionEn;
	const comingSoonLabel = isAr ? "قريباً" : "Coming soon";

	const baseClass =
		variant === "modal"
			? `w-full flex items-start gap-3 py-3.5 px-4 rounded-[var(--radius-lg)] font-semibold transition-all text-[var(--clay-black)] border-2 clay-hover ${meta?.linkClass ?? ""}`
			: `flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 transition-colors ${meta?.linkClass ?? "border-[var(--oat-border)] bg-[var(--warm-cream)]/60"}`;

	const iconClass = meta?.iconClass ?? "text-[var(--matcha-700)]";

	if (!channel.href) {
		return (
			<div
				aria-disabled='true'
				className={`${baseClass} cursor-not-allowed border-dashed opacity-75`}
			>
				<MaterialIcon
					className={`mt-0.5 shrink-0 text-2xl ${iconClass}`}
					name={channel.icon}
				/>
				<span className='flex-1 text-start'>
					<span className='flex flex-wrap items-center gap-2'>
						<span className='block font-bold'>{name}</span>
						<span className='rounded-full bg-[var(--oat-light)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--warm-charcoal)] uppercase'>
							{comingSoonLabel}
						</span>
					</span>
					<span className='mt-0.5 block text-sm font-normal text-[var(--warm-charcoal)]'>
						{description}
					</span>
				</span>
			</div>
		);
	}

	return (
		<a
			className={baseClass}
			href={channel.href}
			rel='noopener noreferrer'
			target='_blank'
		>
			<MaterialIcon
				className={`mt-0.5 shrink-0 text-2xl ${iconClass}`}
				name={channel.icon}
			/>
			<span className='flex-1 text-start'>
				<span
					className={`block font-bold ${variant === "card" ? "text-sm" : ""}`}
				>
					{name}
				</span>
				<span
					className={`mt-0.5 block font-normal text-[var(--warm-charcoal)] ${variant === "card" ? "text-xs" : "text-sm"}`}
				>
					{description}
				</span>
			</span>
		</a>
	);
}

export function CommunityChannelList({
	variant,
	locale = "ar"
}: {
	variant: "modal" | "card";
	locale?: CommunityLocale;
}) {
	const sections = getCommunitySections();
	const isAr = locale === "ar";

	return (
		<div
			className={variant === "modal" ? "flex flex-col gap-5" : "space-y-5"}
			dir={isAr ? "rtl" : "ltr"}
		>
			{sections.map(({ platform, meta, channels }) => (
				<section
					className='space-y-2'
					key={platform}
				>
					<h3 className='flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--warm-charcoal)] uppercase'>
						<MaterialIcon
							className={`text-base ${meta.iconClass}`}
							name={meta.icon}
						/>
						{isAr ? meta.labelAr : meta.labelEn}
					</h3>
					<div
						className={
							variant === "modal" ? "flex flex-col gap-2" : "space-y-2"
						}
					>
						{channels.map(channel => (
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
}
