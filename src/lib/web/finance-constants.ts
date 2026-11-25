// apps/web/src/lib/finance-constants.ts

export interface CategoryMeta {
	icon: string;
	ar: string;
	en: string;
	kind: "revenue" | "expense";
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
	// Revenue
	Consultation: {
		icon: "stethoscope",
		ar: "كشف عيادة",
		en: "Consultation Fee",
		kind: "revenue"
	},
	FollowUp: {
		icon: "event_repeat",
		ar: "إعادة كشف",
		en: "Follow-up / Re-check",
		kind: "revenue"
	},
	Vaccination: {
		icon: "vaccines",
		ar: "تطعيمات",
		en: "Vaccination Administration",
		kind: "revenue"
	},
	Procedure: {
		icon: "medical_services",
		ar: "إجراء طبي",
		en: "Minor Procedure",
		kind: "revenue"
	},
	Emergency: {
		icon: "e911_emergency",
		ar: "طوارئ",
		en: "Emergency Triage",
		kind: "revenue"
	},
	Lab: {
		icon: "biotech",
		ar: "تحاليل وفحوصات",
		en: "Diagnostic / Rapid Test",
		kind: "revenue"
	},

	// Expenses
	Supplies: {
		icon: "inventory_2",
		ar: "مستلزمات طبية",
		en: "Medical Supplies & Consumables",
		kind: "expense"
	},
	Medications: {
		icon: "medication",
		ar: "أدوية ومخزون",
		en: "Medication Restock",
		kind: "expense"
	},
	Rent: {
		icon: "apartment",
		ar: "إيجار العيادة",
		en: "Clinic Rent",
		kind: "expense"
	},
	Utilities: {
		icon: "bolt",
		ar: "كهرباء ومرافق",
		en: "Utilities & Electricity",
		kind: "expense"
	},
	Staff: {
		icon: "badge",
		ar: "رواتب ومكافآت",
		en: "Staff Stipend & Salaries",
		kind: "expense"
	},
	Maintenance: {
		icon: "build",
		ar: "صيانة أجهزة",
		en: "Equipment & Maintenance",
		kind: "expense"
	}
};

export const REVENUE_CATEGORY_OPTIONS: Array<{ value: string; label: string }> =
	[
		{ value: "Consultation", label: "Consultation Fee (كشف عيادة)" },
		{ value: "FollowUp", label: "Follow-up / Re-check (إعادة كشف)" },
		{ value: "Vaccination", label: "Vaccination Administration (تطعيمات)" },
		{ value: "Procedure", label: "Minor Procedure (إجراء بسيط)" },
		{ value: "Emergency", label: "Emergency Triage (طوارئ)" },
		{ value: "Lab", label: "Diagnostic / Rapid Test (فحوصات سريعة)" }
	];

export const EXPENSE_CATEGORY_OPTIONS: Array<{ value: string; label: string }> =
	[
		{ value: "Supplies", label: "Medical Supplies & Consumables (مستلزمات)" },
		{ value: "Medications", label: "Medication Restock (أدوية ومخزون)" },
		{ value: "Rent", label: "Clinic Rent (إيجار العيادة)" },
		{ value: "Utilities", label: "Utilities & Electricity (كهرباء ومرافق)" },
		{ value: "Staff", label: "Staff Stipend & Salaries (مكافآت ورواتب)" },
		{ value: "Maintenance", label: "Equipment & Maintenance (صيانة أجهزة)" }
	];
