import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, eq, platformConfig } from "@/db";
import { AppServerError, toAppServerError } from "../fn-errors";

const announcementSchema = z.object({
	message: z.string().trim().min(1).max(2000),
	severity: z.enum(["info", "warning", "error"])
});

export const getActiveAnnouncementFn = createServerFn({
	method: "GET"
}).handler(async () => {
	try {
		const [setting] = await db
			.select({ value: platformConfig.value })
			.from(platformConfig)
			.where(eq(platformConfig.key, "active_announcement"))
			.limit(1);
		if (!setting) return null;

		let value: unknown;
		try {
			value = JSON.parse(setting.value);
		} catch {
			throw new AppServerError(
				"INTERNAL_SERVER_ERROR",
				"Active announcement configuration is invalid",
				500
			);
		}
		const result = announcementSchema.safeParse(value);
		if (!result.success) {
			throw new AppServerError(
				"INTERNAL_SERVER_ERROR",
				"Active announcement configuration is invalid",
				500
			);
		}
		return result.data;
	} catch (err) {
		toAppServerError(err, "Failed to load the active announcement");
	}
});
