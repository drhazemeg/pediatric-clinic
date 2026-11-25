import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	pgTable,
	primaryKey,
	real,
	serial,
	text,
	timestamp,
	uniqueIndex
} from "drizzle-orm/pg-core";

import { auditFields } from "./auth";
import { patients, visits } from "./clinic";
import { id, timestamps } from "./columns";
import {
	growthGenderEnum,
	growthMetricEnum,
	lmsXAxisEnum,
	measurementIndicatorEnum,
	milestoneDomainEnum,
	patientSexEnum
} from "./enums";

export const measurements = pgTable(
	"measurements",
	{
		id: id(),
		visitId: text("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
		indicator: measurementIndicatorEnum("indicator").notNull(),
		value: real("value").notNull(),
		lengthCmAtMeasurement: real("length_cm_at_measurement"),
		zScore: real("z_score"),
		percentile: real("percentile"),
		classification: text("classification"),
		lmsL: real("lms_l"),
		lmsM: real("lms_m"),
		lmsS: real("lms_s"),
		...timestamps()
	},
	t => [
		uniqueIndex("measurements_visit_indicator_unq").on(t.visitId, t.indicator),
		index("measurements_visit_idx").on(t.visitId),
		index("measurements_indicator_idx").on(t.indicator),
		index("measurements_patient_date_idx").on(t.patientId, t.measuredAt),
		check(
			"measurements_wfl_requires_length",
			sql`${t.indicator} <> 'weight-for-length' OR ${t.lengthCmAtMeasurement} IS NOT NULL`
		)
	]
);

export const lmsReferences = pgTable(
	"lms_references",
	{
		indicator: measurementIndicatorEnum("indicator").notNull(),
		sex: patientSexEnum("sex").notNull(),
		xAxis: lmsXAxisEnum("x_axis").notNull(),
		xValue: real("x_value").notNull(),
		l: real("l").notNull(),
		m: real("m").notNull(),
		s: real("s").notNull(),
		version: text("version").notNull().default("egyptian-2021"),
		sd3neg: real("sd3neg"),
		sd2neg: real("sd2neg"),
		sd1neg: real("sd1neg"),
		sd0: real("sd0"),
		sd1: real("sd1"),
		sd2: real("sd2"),
		sd3: real("sd3"),
		...timestamps()
	},
	t => [
		primaryKey({
			columns: [t.indicator, t.sex, t.xAxis, t.xValue, t.version],
			name: "lms_references_pkey"
		}),
		index("lms_references_lookup_idx").on(
			t.indicator,
			t.sex,
			t.xAxis,
			t.version,
			t.xValue
		)
	]
);

export const milestoneCatalog = pgTable("milestone_catalog", {
	id: text("id").primaryKey(),
	label: text("label").notNull(),
	arabicLabel: text("arabic_label"),
	domain: milestoneDomainEnum("domain").notNull(),
	expectedAgeMonths: integer("expected_age_months").notNull(),
	ageLabel: text("age_label").notNull(),
	redFlagWarning: text("red_flag_warning"),
	notes: text("notes")
});

export const milestones = pgTable(
	"milestones",
	{
		id: id(),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		milestoneId: text("milestone_id")
			.notNull()
			.references(() => milestoneCatalog.id, { onDelete: "restrict" }),
		isAchieved: boolean("is_achieved").notNull().default(false),
		achievedDate: date("achieved_date", { mode: "string" }),
		notes: text("notes"),
		...auditFields(),
		...timestamps()
	},
	t => [
		uniqueIndex("milestones_patient_milestone_unq").on(
			t.patientId,
			t.milestoneId
		),
		index("milestones_patient_idx").on(t.patientId)
	]
);

export const growthStandards = pgTable(
	"growth_standards",
	{
		id: serial("id").primaryKey(),
		metric: growthMetricEnum("metric").notNull(),
		gender: growthGenderEnum("gender").notNull(),
		day: integer("day").notNull(),
		l: real("l").notNull(),
		m: real("m").notNull(),
		s: real("s").notNull(),
		sd4neg: real("sd4neg").notNull(),
		sd3neg: real("sd3neg").notNull(),
		sd2neg: real("sd2neg").notNull(),
		sd1neg: real("sd1neg").notNull(),
		sd0: real("sd0").notNull(),
		sd1: real("sd1").notNull(),
		sd2: real("sd2").notNull(),
		sd3: real("sd3").notNull(),
		sd4: real("sd4").notNull()
	},
	t => [
		uniqueIndex("growth_metric_gender_day_unq").on(t.metric, t.gender, t.day),
		index("growth_lookup_idx").on(t.metric, t.gender, t.day)
	]
);
