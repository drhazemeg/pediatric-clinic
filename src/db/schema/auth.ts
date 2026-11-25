import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp
} from "drizzle-orm/pg-core";

import { authTimestamps, id } from "./columns";
import { auditActionEnum, userRoleEnum } from "./enums";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	...authTimestamps(),
	role: userRoleEnum("role").default("patient").notNull(),
	banned: boolean("banned").default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { withTimezone: true }),
	address: text("address"),
	apiKey: text("api_key"),
	clinicId: text("clinic_id"),
	phone: text("phone")
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		token: text("token").notNull().unique(),
		...authTimestamps(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonated_by")
	},
	t => [index("session_user_id_idx").on(t.userId)]
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			withTimezone: true
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			withTimezone: true
		}),
		scope: text("scope"),
		password: text("password"),
		...authTimestamps()
	},
	t => [index("account_user_id_idx").on(t.userId)]
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		...authTimestamps()
	},
	t => [index("verification_identifier_idx").on(t.identifier)]
);

export const rateLimit = pgTable("rate_limit", {
	id: text("id").primaryKey(),
	key: text("key").notNull().unique(),
	count: integer("count").notNull(),
	lastRequest: integer("last_request").notNull()
});

export function auditFields() {
	return {
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null"
		}),
		updatedBy: text("updated_by").references(() => user.id, {
			onDelete: "set null"
		})
	};
}

export const auditLog = pgTable(
	"audit_log",
	{
		id: id(),
		actorId: text("actor_id"),
		action: auditActionEnum("action").notNull(),
		entity: text("entity").notNull(),
		entityId: text("entity_id").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	t => [
		index("audit_log_entity_idx").on(t.entity, t.entityId),
		index("audit_log_actor_idx").on(t.actorId, t.createdAt),
		index("audit_log_action_idx").on(t.action)
	]
);
