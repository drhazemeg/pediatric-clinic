import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	index,
	pgTable,
	serial,
	text,
	timestamp
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { clinics } from "./clinic";
import { timestamps } from "./columns";
import { ledgerKindEnum, ledgerKinds } from "./enums";

export const clinicLedgerEntries = pgTable(
	"clinic_ledger_entries",
	{
		id: serial("id").primaryKey(),
		clinicId: text("clinic_id")
			.notNull()
			.references(() => clinics.id, { onDelete: "cascade" }),
		kind: ledgerKindEnum("kind").notNull(),
		category: text("category").notNull(),
		amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
		note: text("note"),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		...timestamps()
	},
	t => [
		index("ledger_clinic_occurred_idx").on(t.clinicId, t.occurredAt),
		index("ledger_kind_idx").on(t.kind),
		check("ledger_amount_positive_check", sql`${t.amountCents} > 0`)
	]
);

export const createLedgerEntrySchema = z.object({
	clinicId: z.string().min(1),
	kind: z.enum(ledgerKinds),
	category: z.string().min(1).max(50),
	amountCents: z.number().int().positive(),
	note: z.string().max(200).optional(),
	occurredAt: z.coerce.date()
});

export const ledgerFilterSchema = z.object({
	clinicId: z.string().min(1),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional()
});

export type ClinicLedgerEntry = typeof clinicLedgerEntries.$inferSelect;
export type NewClinicLedgerEntry = typeof clinicLedgerEntries.$inferInsert;
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;
export type LedgerFilterInput = z.infer<typeof ledgerFilterSchema>;
