// apps/web/src/lib/community-links.ts

export type CommunityPlatform = "whatsapp" | "youtube";
export type CommunityLocale = "ar" | "en";

export type CommunityChannel = {
	id: string;
	platform: CommunityPlatform;
	nameAr: string;
	nameEn: string;
	descriptionAr: string;
	descriptionEn: string;
	/** null = not yet configured; displays as coming soon */
	href: string | null;
	icon: string;
};

export const COMMUNITY_PLATFORM_META: Record<
	CommunityPlatform,
	{
		labelAr: string;
		labelEn: string;
		icon: string;
		linkClass: string;
		iconClass: string;
	}
> = {
	whatsapp: {
		labelAr: "واتساب العيادة",
		labelEn: "Clinic WhatsApp",
		icon: "chat",
		linkClass: "bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20",
		iconClass: "text-[#128C7E]"
	},
	youtube: {
		labelAr: "المحتوى التوعوي",
		labelEn: "Parent Education",
		icon: "play_circle",
		linkClass: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
		iconClass: "text-red-600"
	}
};

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
	{
		id: "hurghada-clinic-whatsapp",
		platform: "whatsapp",
		nameAr: "حجز ومواعيد العيادة — الغردقة",
		nameEn: "Clinic Appointments & Inquiries — Hurghada",
		descriptionAr:
			"تنسيق مواعيد الكشف، التطعيمات، واستشارات الرضاعة الطبيعية مع فريق العيادة.",
		descriptionEn:
			"Coordinate outpatient visits, immunizations, and IBCLC lactation consultations.",
		href: null,
		icon: "support_agent"
	},
	{
		id: "parent-series-education",
		platform: "youtube",
		nameAr: "د. حازم | طب الأطفال والرضاعة",
		nameEn: "Dr. Hazem | Pediatric & Lactation Care",
		descriptionAr:
			"حلقات وإرشادات مبسطة للأمهات والآباء حول الرضاعة الطبيعية، النمو، والعناية بالرضع.",
		descriptionEn:
			"Educational guidance for parents on breastfeeding, newborn care, and child growth.",
		href: null,
		icon: "child_care"
	}
];

export const COMMUNITY_PROMPT_STORAGE_KEY =
	"smart_clinic_community_prompt_seen";

const PLATFORM_ORDER: CommunityPlatform[] = ["whatsapp", "youtube"];

export function getCommunitySections() {
	return PLATFORM_ORDER.map(platform => ({
		platform,
		meta: COMMUNITY_PLATFORM_META[platform],
		channels: COMMUNITY_CHANNELS.filter(c => c.platform === platform)
	})).filter(section => section.channels.length > 0);
}
