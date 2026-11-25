import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp
} from "drizzle-orm/pg-core";
import type { DrugMonograph } from "@/lib/features/medications/formulary";
import type { DrugFormularyItem } from "@/lib/features/medications/index";
import { user } from "./auth";
import { patients, visits } from "./clinic";
import { id, timestamps } from "./columns";
import { prescriptionStatusEnum } from "./enums";

export const prescriptions = pgTable(
	"prescriptions",
	{
		id: id(),
		visitId: text("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		prescribedById: text("prescribed_by_id").references(() => user.id, {
			onDelete: "set null"
		}),
		medicationName: text("medication_name").notNull(),
		dosage: text("dosage").notNull(),
		frequency: text("frequency").notNull(),
		durationDays: integer("duration_days"),
		instructions: text("instructions"),
		status: prescriptionStatusEnum("status").notNull().default("active"),
		statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
		prescribedAt: timestamp("prescribed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		...timestamps()
	},
	t => [
		index("prescriptions_visit_idx").on(t.visitId),
		index("prescriptions_patient_idx").on(t.patientId),
		index("prescriptions_date_idx").on(t.prescribedAt),
		index("prescriptions_patient_status_idx").on(t.patientId, t.status),
		check(
			"prescriptions_duration_positive_check",
			sql`${t.durationDays} IS NULL OR ${t.durationDays} > 0`
		)
	]
);

export const drugFormulary = pgTable(
	"drug_formulary",
	{
		id: text("id").primaryKey(),
		genericName: text("generic_name").notNull(),
		pharmacologicalCategory: text("pharmacological_category").notNull(),
		atcCode: text("atc_code"),
		awareClassification: text("aware_classification"),
		data: jsonb("data").$type<DrugMonograph>().notNull(),
		sourceEdition: text("source_edition").notNull().default("EDA-2024"),
		...timestamps()
	},
	t => [
		index("drug_formulary_generic_idx").on(t.genericName),
		index("drug_formulary_category_idx").on(t.pharmacologicalCategory)
	]
);

export const neonatalFormulary = pgTable(
	"neonatal_formulary",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		genericName: text("generic_name").notNull(),
		category: text("category").notNull(),
		data: jsonb("data").$type<DrugFormularyItem>().notNull(),
		...timestamps()
	},
	t => [
		index("neonatal_formulary_category_idx").on(t.category),
		index("neonatal_formulary_generic_idx").on(t.genericName)
	]
);
