// apps/web/src/lib/umami.ts

export const AnalyticsEvent = {
	VISIT_START: "visit_start",
	VISIT_COMPLETE: "visit_complete",
	VISIT_CANCELLED: "visit_cancelled",
	AI_CLINICAL_REQUEST: "ai_clinical_request",
	AI_DOSING_CHECK: "ai_dosing_check",
	SIGN_IN: "sign_in",
	SIGN_OUT: "sign_out",
	PATIENT_REGISTERED: "patient_registered",
	PRESCRIPTION_CREATED: "prescription_created",
	LEDGER_ENTRY_CREATED: "ledger_entry_created",
	VIEW_FINANCE: "view_finance",
	VIEW_GROWTH: "view_growth",
	VIEW_IMMUNIZATIONS: "view_immunizations"
} as const;

export type AnalyticsEventName =
	(typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export interface VisitStartPayload {
	visit_type: string;
	is_walk_in: boolean;
}

export interface VisitCompletePayload {
	visit_type: string;
	duration_sec: number;
	has_prescription: boolean;
}

export interface VisitCancelledPayload {
	visit_type: string;
	reason?: string;
}

export interface AiClinicalPayload {
	task_kind: string;
	language: "ar" | "en";
}

export interface AiDosingCheckPayload {
	drug_name?: string;
	language: "ar" | "en";
}

export interface PatientRegisteredPayload {
	sex: "male" | "female";
	is_preterm?: boolean;
}

export interface LedgerEntryPayload {
	kind: "revenue" | "expense";
	category: string;
}

type EventPayloadMap = {
	[AnalyticsEvent.VISIT_START]: VisitStartPayload;
	[AnalyticsEvent.VISIT_COMPLETE]: VisitCompletePayload;
	[AnalyticsEvent.VISIT_CANCELLED]: VisitCancelledPayload;
	[AnalyticsEvent.AI_CLINICAL_REQUEST]: AiClinicalPayload;
	[AnalyticsEvent.AI_DOSING_CHECK]: AiDosingCheckPayload;
	[AnalyticsEvent.PATIENT_REGISTERED]: PatientRegisteredPayload;
	[AnalyticsEvent.LEDGER_ENTRY_CREATED]: LedgerEntryPayload;
	[AnalyticsEvent.SIGN_IN]: Record<string, never>;
	[AnalyticsEvent.SIGN_OUT]: Record<string, never>;
	[AnalyticsEvent.PRESCRIPTION_CREATED]: Record<string, never>;
	[AnalyticsEvent.VIEW_FINANCE]: Record<string, never>;
	[AnalyticsEvent.VIEW_GROWTH]: Record<string, never>;
	[AnalyticsEvent.VIEW_IMMUNIZATIONS]: Record<string, never>;
};

export function trackUmamiEvent<T extends AnalyticsEventName>(
	eventName: T,
	payload?: T extends keyof EventPayloadMap ? EventPayloadMap[T] : never
): void {
	if (import.meta.env.DEV) return;
	if (typeof window === "undefined" || !window.umami) return;
	window.umami.track(eventName, payload as Record<string, unknown>);
}
