// apps/web/src/lib/site-seo.ts

export const SITE_URL =
	import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") ||
	"https://clinic.drhazemali.com";

export const SITE_NAME =
	"د. حازم علي — طب الأطفال والرضاعة | Dr. Hazem Ali Pediatric & Lactation Clinic";

/** Separate OG (PNG) + Twitter (JPEG) assets for social crawler compatibility. */
export const OG_IMAGE_PATH = "/opengraph-image.png";
export const TWITTER_IMAGE_PATH = "/twitter-image.jpg";

export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
export const TWITTER_IMAGE_URL = `${SITE_URL}${TWITTER_IMAGE_PATH}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
	"عيادة د. حازم علي لطب الأطفال وحديثي الولادة واستشارات الرضاعة الطبيعية بالغردقة | Dr. Hazem Ali Pediatric & IBCLC Clinic in Hurghada";

export const DEFAULT_SITE_TITLE =
	"د. حازم علي — عيادة طب الأطفال وحديثي الولادة والرضاعة الطبيعية بالغردقة | Dr. Hazem Ali, M.D.";

export const DEFAULT_SITE_DESCRIPTION =
	"رعاية طبية متكاملة لحديثي الولادة والرضع والأطفال واستشارات الرضاعة الطبيعية المعتمدة (IBCLC) ومتابعة منحنيات النمو والتطعيمات في الغردقة، البحر الأحمر.";

export type SiteLocale = "ar" | "en";

export type SiteHeadInput = {
	title?: string;
	description?: string;
	url?: string;
	locale?: SiteLocale;
	imagePath?: string;
	twitterImagePath?: string;
};

/** Shared Open Graph + Twitter tags for TanStack Router `head()`. */
export function buildSocialMeta(input: SiteHeadInput = {}) {
	const title = input.title ?? DEFAULT_SITE_TITLE;
	const description = input.description ?? DEFAULT_SITE_DESCRIPTION;
	const url = input.url ?? `${SITE_URL}/`;
	const isAr = (input.locale ?? "ar") === "ar";
	const ogImageUrl = input.imagePath
		? `${SITE_URL}${input.imagePath}`
		: OG_IMAGE_URL;
	const twitterImageUrl = input.twitterImagePath
		? `${SITE_URL}${input.twitterImagePath}`
		: TWITTER_IMAGE_URL;

	return [
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: url },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:locale", content: isAr ? "ar_EG" : "en_US" },
		{ property: "og:locale:alternate", content: isAr ? "en_US" : "ar_EG" },
		{ property: "og:type", content: "website" },
		{ property: "og:image", content: ogImageUrl },
		{ property: "og:image:secure_url", content: ogImageUrl },
		{ property: "og:image:type", content: "image/png" },
		{ property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
		{ property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
		{ property: "og:image:alt", content: OG_IMAGE_ALT },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: twitterImageUrl },
		{ name: "twitter:image:alt", content: OG_IMAGE_ALT },
		{ name: "twitter:image:type", content: "image/jpeg" },
		{ name: "twitter:image:width", content: String(OG_IMAGE_WIDTH) },
		{ name: "twitter:image:height", content: String(OG_IMAGE_HEIGHT) }
	];
}
