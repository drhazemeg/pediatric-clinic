import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {db, eq} from "@/db";
import {user} from "@/db/schema";
import {
    getConfig,
    getPlatformAiConfig,
    getPoolUsage,
    getUserCredit,
    setConfig
} from "@/lib/utils/credit";
import {AppServerError, toAppServerError} from "../fn-errors";
import {clinicalStaffMiddleware} from "../fn-middleware";

const providerSchema = z.enum([
	"google",
	"anthropic",
	"openai",
	"openrouter",
	"custom"
]);
export type Provider = z.infer<typeof providerSchema>;
export async function resolveUserAiConfig(userId: string) {
	const [account] = await db
		.select({ apiKey: user.apiKey })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	const platform = await getPlatformAiConfig();
	const [provider, model, baseUrl] = await Promise.all([
		getUserConfig(userId, "provider", platform.provider),
		getUserConfig(userId, "model", platform.model),
		getUserConfig(userId, "base_url", platform.baseUrl)
	]);
	const apiKey = account?.apiKey || platform.apiKey;
	if (!apiKey) {
		throw new AppServerError(
			"BAD_REQUEST",
			"Configure an AI API key before starting a generation",
			400
		);
	}
	return { provider, model, baseUrl, apiKey };
}

async function getUserConfig(
	userId: string,
	name: string,
	fallback: string
): Promise<string> {
	return getConfig(`user_ai_${userId}_${name}`, () => fallback);
}

export const getAiConfigFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.handler(async ({ context }) => {
		try {
			const [account, platform] = await Promise.all([
				db
					.select({ apiKey: user.apiKey })
					.from(user)
					.where(eq(user.id, context.user.id))
					.limit(1),
				getPlatformAiConfig()
			]);
			const [provider, model, baseUrl] = await Promise.all([
				getUserConfig(context.user.id, "provider", platform.provider),
				getUserConfig(context.user.id, "model", platform.model),
				getUserConfig(context.user.id, "base_url", platform.baseUrl)
			]);
			return {
				provider,
				model,
				baseUrl,
				hasApiKey: Boolean(account[0]?.apiKey || platform.apiKey)
			};
		} catch (err) {
			toAppServerError(err, "Failed to load AI configuration");
		}
	});

export const updateAiConfigFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			provider: providerSchema,
			model: z.string().trim().min(1).max(200).optional(),
			apiKey: z.string().trim().min(1).max(500).optional(),
			baseUrl: z.string().url().max(500).optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			if (data.apiKey) {
				await db
					.update(user)
					.set({ apiKey: data.apiKey })
					.where(eq(user.id, context.user.id));
			}
			await Promise.all([
				setConfig(`user_ai_${context.user.id}_provider`, data.provider),
				...(data.model
					? [setConfig(`user_ai_${context.user.id}_model`, data.model)]
					: []),
				...(data.baseUrl
					? [setConfig(`user_ai_${context.user.id}_base_url`, data.baseUrl)]
					: [])
			]);
			return { saved: true as const };
		} catch (err) {
			toAppServerError(err, "Failed to save AI configuration");
		}
	});

export const getCreditFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.handler(async ({ context }) => {
		try {
			const [credit, pool] = await Promise.all([
				getUserCredit(context.user.id),
				getPoolUsage()
			]);
			return {
				balance: credit.tokenBalance,
				lifetimeTokensUsed: credit.lifetimeTokensUsed,
				pool
			};
		} catch (err) {
			toAppServerError(err, "Failed to load AI credit balance");
		}
	});
