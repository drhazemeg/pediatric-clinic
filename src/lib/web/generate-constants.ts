// apps/web/src/lib/generate-constants.ts

export interface ClinicCareService {
	id: string;
	nameEn: string;
	nameAr: string;
	icon: string;
}

export interface ClinicalSection {
	id: string;
	nameEn: string;
	nameAr: string;
	icon: string;
	allowedServices: string[];
}

export interface ClinicalTemplateFormat {
	id: string;
	nameEn: string;
	nameAr: string;
	allowedServices: string[];
}

export const CLINIC_SERVICES: ClinicCareService[] = [
	{
		id: "NEWBORN_CARE",
		nameEn: "Newborn Care",
		nameAr: "رعاية حديثي الولادة",
		icon: "child_care"
	},
	{
		id: "LACTATION_IBCLC",
		nameEn: "Lactation Support (IBCLC)",
		nameAr: "استشارات الرضاعة الطبيعية",
		icon: "breastfeeding"
	},
	{
		id: "IMMUNIZATIONS",
		nameEn: "Immunizations",
		nameAr: "التطعيمات",
		icon: "vaccines"
	},
	{
		id: "SICK_VISITS",
		nameEn: "Acute Sick Visits",
		nameAr: "كشف الحالات الحادة",
		icon: "stethoscope"
	},
	{
		id: "CHRONIC_ALLERGY",
		nameEn: "Chronic & Allergy Care",
		nameAr: "الحساسية والمتابعة المزمنة",
		icon: "monitoring"
	},
	{
		id: "WELL_CHILD_GROWTH",
		nameEn: "Well-Child & Growth",
		nameAr: "النمو والتطور الحركي",
		icon: "show_chart"
	}
];

const ALL_CLINIC_SERVICES = CLINIC_SERVICES.map(s => s.id);

export const CLINICAL_SECTIONS: ClinicalSection[] = [
	{
		id: "SOAP_ENCOUNTER",
		nameEn: "SOAP Encounter",
		nameAr: "الفحص الإكلينيكي (SOAP)",
		icon: "clinical_notes",
		allowedServices: ALL_CLINIC_SERVICES
	},
	{
		id: "GROWTH_ANTHROPOMETRY",
		nameEn: "Growth & LMS",
		nameAr: "النمو والمنحنيات",
		icon: "show_chart",
		allowedServices: ["NEWBORN_CARE", "LACTATION_IBCLC", "WELL_CHILD_GROWTH"]
	},
	{
		id: "LACTATION_ASSESSMENT",
		nameEn: "Feeding & Latch",
		nameAr: "تقييم الرضاعة والالتقام",
		icon: "breastfeeding",
		allowedServices: ["NEWBORN_CARE", "LACTATION_IBCLC"]
	},
	{
		id: "VACCINE_SCHEDULE",
		nameEn: "Immunization Plan",
		nameAr: "جدول التطعيمات",
		icon: "vaccines",
		allowedServices: ["IMMUNIZATIONS", "WELL_CHILD_GROWTH"]
	}
];

export const CLINICAL_FORMATS: ClinicalTemplateFormat[] = [
	{
		id: "soap_note",
		nameEn: "Structured SOAP Note",
		nameAr: "ملاحظة فحص SOAP",
		allowedServices: ALL_CLINIC_SERVICES
	},
	{
		id: "parent_education_ar",
		nameEn: "Arabic Parent Care Sheet",
		nameAr: "إرشادات الأهل بالعربية",
		allowedServices: ALL_CLINIC_SERVICES
	},
	{
		id: "parent_education_en",
		nameEn: "English Parent Care Sheet",
		nameAr: "إرشادات الأهل بالإنجليزية",
		allowedServices: ALL_CLINIC_SERVICES
	},
	{
		id: "pediatric_dosing_safety",
		nameEn: "Weight-Dosing Safety Check",
		nameAr: "مراجعة أمان الجرعة بالوزن",
		allowedServices: ["NEWBORN_CARE", "SICK_VISITS", "CHRONIC_ALLERGY"]
	},
	{
		id: "growth_interpretation",
		nameEn: "WHO / Egypt Z-Score Summary",
		nameAr: "قراءة منحنيات النمو",
		allowedServices: ["NEWBORN_CARE", "LACTATION_IBCLC", "WELL_CHILD_GROWTH"]
	},
	{
		id: "immunization_advice",
		nameEn: "Vaccine & Catch-Up Summary",
		nameAr: "توصيات التطعيم والتعويض",
		allowedServices: ["IMMUNIZATIONS", "WELL_CHILD_GROWTH"]
	},
	{
		id: "follow_up_questions",
		nameEn: "Red-Flag & Follow-Up Checklist",
		nameAr: "علامات الخطر والمتابعة",
		allowedServices: ALL_CLINIC_SERVICES
	}
];

export const CLINICAL_TOPICS: string[] = [
	"Neonatal Jaundice",
	"Latch & Milk Supply",
	"Fever & Hydration",
	"Acute Respiratory Illness",
	"Gastroenteritis & Diarrhea",
	"Cow's Milk / Skin Allergy",
	"Complementary Feeding",
	"Catch-Up Vaccination",
	"Growth & Z-Score Review",
	"Developmental Milestones"
];

export const AGE_GROUPS = [
	"Neonate (0–28d)",
	"Infant (1–12m)",
	"Toddler (1–3y)",
	"Preschool (3–5y)",
	"School Age (5–12y)"
] as const;

export const FOLLOW_UP_INTERVAL_PRESETS = [
	{ value: 3, labelEn: "3 Days", labelAr: "3 أيام" },
	{ value: 7, labelEn: "1 Week", labelAr: "أسبوع" },
	{ value: 14, labelEn: "2 Weeks", labelAr: "أسبوعان" },
	{ value: 30, labelEn: "1 Month", labelAr: "شهر" }
] as const;
