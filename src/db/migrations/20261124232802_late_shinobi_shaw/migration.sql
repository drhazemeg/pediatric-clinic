CREATE TYPE "appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no-show');--> statement-breakpoint
CREATE TYPE "audit_action" AS ENUM('create', 'update', 'delete', 'view');--> statement-breakpoint
CREATE TYPE "diagnosis_type" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TYPE "growth_gender" AS ENUM('boys', 'girls');--> statement-breakpoint
CREATE TYPE "growth_metric" AS ENUM('lhfa', 'wfa');--> statement-breakpoint
CREATE TYPE "immunization_status" AS ENUM('planned', 'due', 'administered', 'deferred', 'contraindicated', 'missed', 'refused');--> statement-breakpoint
CREATE TYPE "ledger_kind" AS ENUM('expense', 'revenue');--> statement-breakpoint
CREATE TYPE "lms_x_axis" AS ENUM('age', 'length');--> statement-breakpoint
CREATE TYPE "measurement_indicator" AS ENUM('weight-for-age', 'length-for-age', 'weight-for-length', 'bmi-for-age', 'head-circumference-for-age');--> statement-breakpoint
CREATE TYPE "milestone_domain" AS ENUM('gross-motor', 'fine-motor', 'language', 'social-cognitive');--> statement-breakpoint
CREATE TYPE "patient_gender" AS ENUM('boy', 'girl');--> statement-breakpoint
CREATE TYPE "patient_sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "prescription_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "queue_status" AS ENUM('WAITING', 'IN_VITALS', 'WITH_DOCTOR', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('admin', 'doctor', 'patient', 'staff');--> statement-breakpoint
CREATE TYPE "visit_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"admin_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_user_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"doctor_id" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 15 NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled'::"appointment_status" NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_duration_positive_check" CHECK ("duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY,
	"actor_id" text,
	"action" "audit_action" NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_job" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"progress_message" text,
	"error_message" text,
	"input_json" jsonb NOT NULL,
	"result_json" jsonb,
	"logs" jsonb DEFAULT '[]' NOT NULL,
	"tokens_used" integer,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"issue_date" date NOT NULL,
	"certificate_type" text NOT NULL,
	"title" text NOT NULL,
	"diagnosis" text,
	"body" text NOT NULL,
	"issued_by" text,
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_ledger_entries" (
	"id" serial PRIMARY KEY,
	"clinic_id" text NOT NULL,
	"kind" "ledger_kind" NOT NULL,
	"category" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_amount_positive_check" CHECK ("amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "clinic_queue" (
	"id" text PRIMARY KEY,
	"clinic_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"appointment_id" text,
	"doctor_id" text,
	"queue_number" integer NOT NULL,
	"status" "queue_status" DEFAULT 'WAITING'::"queue_status" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_walk_in" boolean DEFAULT false NOT NULL,
	"chief_complaint" text,
	"called_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"tokens_used" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transaction_tokens_used_nonneg_check" CHECK ("tokens_used" IS NULL OR "tokens_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "diagnoses" (
	"id" text PRIMARY KEY,
	"visit_id" text NOT NULL,
	"icd_code" text NOT NULL,
	"description" text NOT NULL,
	"type" "diagnosis_type" DEFAULT 'primary'::"diagnosis_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_formulary" (
	"id" text PRIMARY KEY,
	"generic_name" text NOT NULL,
	"pharmacological_category" text NOT NULL,
	"atc_code" text,
	"aware_classification" text,
	"data" jsonb NOT NULL,
	"source_edition" text DEFAULT 'EDA-2024' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_standards" (
	"id" serial PRIMARY KEY,
	"metric" "growth_metric" NOT NULL,
	"gender" "growth_gender" NOT NULL,
	"day" integer NOT NULL,
	"l" real NOT NULL,
	"m" real NOT NULL,
	"s" real NOT NULL,
	"sd4neg" real NOT NULL,
	"sd3neg" real NOT NULL,
	"sd2neg" real NOT NULL,
	"sd1neg" real NOT NULL,
	"sd0" real NOT NULL,
	"sd1" real NOT NULL,
	"sd2" real NOT NULL,
	"sd3" real NOT NULL,
	"sd4" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_links" (
	"user_id" text,
	"patient_id" text,
	"guardian_name" text,
	"phone" text,
	"relation" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_links_pkey" PRIMARY KEY("user_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency" (
	"id" text PRIMARY KEY,
	"request_hash" text NOT NULL UNIQUE,
	"key" text NOT NULL UNIQUE,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "immunizations" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"visit_id" text,
	"vaccine_id" text,
	"vaccine_key" text NOT NULL,
	"vaccine_name" text NOT NULL,
	"dose_number" integer DEFAULT 1,
	"target_age_months" real NOT NULL,
	"status" "immunization_status" DEFAULT 'planned'::"immunization_status" NOT NULL,
	"administered_date" timestamp with time zone,
	"due_date" date,
	"next_due_date" date,
	"manufacturer" text,
	"lot_number" text,
	"site" text,
	"route" text,
	"administered_by_id" text,
	"administered_by_name" text,
	"facility" text,
	"expiry_date" date,
	"adverse_events" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "immunizations_dose_nonnegative_check" CHECK ("dose_number" IS NULL OR "dose_number" >= 0),
	CONSTRAINT "immunizations_target_age_nonnegative_check" CHECK ("target_age_months" >= 0),
	CONSTRAINT "immunizations_version_positive_check" CHECK ("version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "lms_references" (
	"indicator" "measurement_indicator",
	"sex" "patient_sex",
	"x_axis" "lms_x_axis",
	"x_value" real,
	"l" real NOT NULL,
	"m" real NOT NULL,
	"s" real NOT NULL,
	"version" text DEFAULT 'egyptian-2021',
	"sd3neg" real,
	"sd2neg" real,
	"sd1neg" real,
	"sd0" real,
	"sd1" real,
	"sd2" real,
	"sd3" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lms_references_pkey" PRIMARY KEY("indicator","sex","x_axis","x_value","version")
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" text PRIMARY KEY,
	"visit_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"indicator" "measurement_indicator" NOT NULL,
	"value" real NOT NULL,
	"length_cm_at_measurement" real,
	"z_score" real,
	"percentile" real,
	"classification" text,
	"lms_l" real,
	"lms_m" real,
	"lms_s" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurements_wfl_requires_length" CHECK ("indicator" <> 'weight-for-length' OR "length_cm_at_measurement" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "medical_notes" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"visit_id" text,
	"author_id" text,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_catalog" (
	"id" text PRIMARY KEY,
	"label" text NOT NULL,
	"arabic_label" text,
	"domain" "milestone_domain" NOT NULL,
	"expected_age_months" integer NOT NULL,
	"age_label" text NOT NULL,
	"red_flag_warning" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"milestone_id" text NOT NULL,
	"is_achieved" boolean DEFAULT false NOT NULL,
	"achieved_date" date,
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neonatal_formulary" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"generic_name" text NOT NULL,
	"category" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" text PRIMARY KEY,
	"clinic_id" text,
	"provider_id" text,
	"mrn" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"sex" "patient_sex" NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone" text,
	"address" text,
	"allergies" text,
	"gestational_age_weeks" real,
	"birth_weight_kg" real,
	"birth_length_cm" real,
	"birth_head_circumference_cm" real,
	"weight_kg" real,
	"parent_name" text,
	"parent_phone" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_version_positive_check" CHECK ("version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" text PRIMARY KEY,
	"visit_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"prescribed_by_id" text,
	"medication_name" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"duration_days" integer,
	"instructions" text,
	"status" "prescription_status" DEFAULT 'active'::"prescription_status" NOT NULL,
	"status_changed_at" timestamp with time zone,
	"prescribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prescriptions_duration_positive_check" CHECK ("duration_days" IS NULL OR "duration_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY,
	"key" text NOT NULL UNIQUE,
	"count" integer NOT NULL,
	"last_request" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"role" "user_role" DEFAULT 'patient'::"user_role" NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"address" text,
	"api_key" text,
	"clinic_id" text,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "user_credit" (
	"user_id" text PRIMARY KEY,
	"token_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_credit_lifetime_tokens_nonneg_check" CHECK ("lifetime_tokens_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vaccine_catalog" (
	"id" text PRIMARY KEY,
	"label" text NOT NULL,
	"arabic_label" text,
	"disease" text NOT NULL,
	"recommended_age_months" integer NOT NULL,
	"recommended_age_label" text NOT NULL,
	"schedule" text DEFAULT 'egypt-moh' NOT NULL,
	"is_mandatory_moh" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"clinic_id" text NOT NULL,
	"appointment_id" text,
	"doctor_id" text,
	"visited_at" timestamp with time zone NOT NULL,
	"status" "visit_status" DEFAULT 'completed'::"visit_status" NOT NULL,
	"age_months" real NOT NULL,
	"age_years" integer,
	"age_months_remainder" integer,
	"chief_complaint" text,
	"diagnosis" text,
	"symptoms" text,
	"physical_exam" text,
	"plan" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_age_months_nonneg_check" CHECK ("age_months" >= 0)
);
--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_user_id_idx" ON "admin_audit_log" ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_user_id_idx" ON "admin_audit_log" ("target_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log" ("action");--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" ("patient_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_clinic_idx" ON "appointments" ("clinic_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_doctor_idx" ON "appointments" ("doctor_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" ("status");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" ("action");--> statement-breakpoint
CREATE INDEX "background_job_user_idx" ON "background_job" ("user_id");--> statement-breakpoint
CREATE INDEX "background_job_status_idx" ON "background_job" ("status");--> statement-breakpoint
CREATE INDEX "background_job_kind_idx" ON "background_job" ("kind");--> statement-breakpoint
CREATE INDEX "certificates_patient_idx" ON "certificates" ("patient_id");--> statement-breakpoint
CREATE INDEX "certificates_date_idx" ON "certificates" ("issue_date");--> statement-breakpoint
CREATE INDEX "ledger_clinic_occurred_idx" ON "clinic_ledger_entries" ("clinic_id","occurred_at");--> statement-breakpoint
CREATE INDEX "ledger_kind_idx" ON "clinic_ledger_entries" ("kind");--> statement-breakpoint
CREATE INDEX "clinic_queue_clinic_date_idx" ON "clinic_queue" ("clinic_id","created_at");--> statement-breakpoint
CREATE INDEX "clinic_queue_status_idx" ON "clinic_queue" ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "clinic_queue_patient_idx" ON "clinic_queue" ("patient_id");--> statement-breakpoint
CREATE INDEX "clinic_queue_doctor_idx" ON "clinic_queue" ("doctor_id");--> statement-breakpoint
CREATE INDEX "credit_transaction_user_id_idx" ON "credit_transaction" ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transaction_user_created_idx" ON "credit_transaction" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "diagnoses_visit_idx" ON "diagnoses" ("visit_id");--> statement-breakpoint
CREATE INDEX "diagnoses_icd_idx" ON "diagnoses" ("icd_code");--> statement-breakpoint
CREATE INDEX "drug_formulary_generic_idx" ON "drug_formulary" ("generic_name");--> statement-breakpoint
CREATE INDEX "drug_formulary_category_idx" ON "drug_formulary" ("pharmacological_category");--> statement-breakpoint
CREATE UNIQUE INDEX "growth_metric_gender_day_unq" ON "growth_standards" ("metric","gender","day");--> statement-breakpoint
CREATE INDEX "growth_lookup_idx" ON "growth_standards" ("metric","gender","day");--> statement-breakpoint
CREATE INDEX "guardian_links_patient_id_idx" ON "guardian_links" ("patient_id");--> statement-breakpoint
CREATE INDEX "immunizations_patient_idx" ON "immunizations" ("patient_id","target_age_months");--> statement-breakpoint
CREATE INDEX "immunizations_patient_dose_idx" ON "immunizations" ("patient_id","vaccine_key","dose_number","updated_at");--> statement-breakpoint
CREATE INDEX "immunizations_visit_idx" ON "immunizations" ("visit_id");--> statement-breakpoint
CREATE INDEX "immunizations_vaccine_idx" ON "immunizations" ("vaccine_id");--> statement-breakpoint
CREATE INDEX "immunizations_status_idx" ON "immunizations" ("status");--> statement-breakpoint
CREATE INDEX "immunizations_due_idx" ON "immunizations" ("due_date","status");--> statement-breakpoint
CREATE INDEX "immunizations_administered_date_idx" ON "immunizations" ("administered_date");--> statement-breakpoint
CREATE INDEX "lms_references_lookup_idx" ON "lms_references" ("indicator","sex","x_axis","version","x_value");--> statement-breakpoint
CREATE UNIQUE INDEX "measurements_visit_indicator_unq" ON "measurements" ("visit_id","indicator");--> statement-breakpoint
CREATE INDEX "measurements_visit_idx" ON "measurements" ("visit_id");--> statement-breakpoint
CREATE INDEX "measurements_indicator_idx" ON "measurements" ("indicator");--> statement-breakpoint
CREATE INDEX "measurements_patient_date_idx" ON "measurements" ("patient_id","measured_at");--> statement-breakpoint
CREATE INDEX "medical_notes_patient_idx" ON "medical_notes" ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "medical_notes_visit_idx" ON "medical_notes" ("visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_patient_milestone_unq" ON "milestones" ("patient_id","milestone_id");--> statement-breakpoint
CREATE INDEX "milestones_patient_idx" ON "milestones" ("patient_id");--> statement-breakpoint
CREATE INDEX "neonatal_formulary_category_idx" ON "neonatal_formulary" ("category");--> statement-breakpoint
CREATE INDEX "neonatal_formulary_generic_idx" ON "neonatal_formulary" ("generic_name");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_clinic_mrn_unq" ON "patients" ("clinic_id","mrn");--> statement-breakpoint
CREATE INDEX "patients_provider_idx" ON "patients" ("provider_id");--> statement-breakpoint
CREATE INDEX "patients_clinic_idx" ON "patients" ("clinic_id");--> statement-breakpoint
CREATE INDEX "patients_name_idx" ON "patients" ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "patients_dob_idx" ON "patients" ("date_of_birth");--> statement-breakpoint
CREATE INDEX "patients_active_idx" ON "patients" ("provider_id","created_at","id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "prescriptions_visit_idx" ON "prescriptions" ("visit_id");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_idx" ON "prescriptions" ("patient_id");--> statement-breakpoint
CREATE INDEX "prescriptions_date_idx" ON "prescriptions" ("prescribed_at");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_status_idx" ON "prescriptions" ("patient_id","status");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "user_credit_user_id_idx" ON "user_credit" ("user_id");--> statement-breakpoint
CREATE INDEX "vaccine_catalog_age_idx" ON "vaccine_catalog" ("recommended_age_months");--> statement-breakpoint
CREATE INDEX "vaccine_catalog_schedule_idx" ON "vaccine_catalog" ("schedule");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "visits_patient_idx" ON "visits" ("patient_id","visited_at");--> statement-breakpoint
CREATE INDEX "visits_clinic_idx" ON "visits" ("clinic_id","visited_at");--> statement-breakpoint
CREATE INDEX "visits_doctor_idx" ON "visits" ("doctor_id","visited_at");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_user_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinic_ledger_entries" ADD CONSTRAINT "clinic_ledger_entries_clinic_id_clinics_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinic_queue" ADD CONSTRAINT "clinic_queue_clinic_id_clinics_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinic_queue" ADD CONSTRAINT "clinic_queue_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clinic_queue" ADD CONSTRAINT "clinic_queue_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinic_queue" ADD CONSTRAINT "clinic_queue_doctor_id_user_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinic_queue" ADD CONSTRAINT "clinic_queue_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "clinic_queue" ADD CONSTRAINT "clinic_queue_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_visit_id_visits_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "immunizations" ADD CONSTRAINT "immunizations_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "immunizations" ADD CONSTRAINT "immunizations_visit_id_visits_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "immunizations" ADD CONSTRAINT "immunizations_vaccine_id_vaccine_catalog_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccine_catalog"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "immunizations" ADD CONSTRAINT "immunizations_administered_by_id_user_id_fkey" FOREIGN KEY ("administered_by_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "immunizations" ADD CONSTRAINT "immunizations_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "immunizations" ADD CONSTRAINT "immunizations_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_visit_id_visits_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "medical_notes" ADD CONSTRAINT "medical_notes_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "medical_notes" ADD CONSTRAINT "medical_notes_visit_id_visits_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medical_notes" ADD CONSTRAINT "medical_notes_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_milestone_id_milestone_catalog_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestone_catalog"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_clinics_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_provider_id_user_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_visit_id_visits_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribed_by_id_user_id_fkey" FOREIGN KEY ("prescribed_by_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_credit" ADD CONSTRAINT "user_credit_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_clinic_id_clinics_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctor_id_user_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "user"("id") ON DELETE SET NULL;