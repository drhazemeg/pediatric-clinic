import type { ClinicGenerationInput } from './schemas';

import { formatSafeAge } from './deidentify';
import { GenerationError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Guard: clinical precondition checks before hitting the LLM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve current weight in kg from patient record.
 * Order of trust:
 *   1. patient.weightKg   (explicit current weight)
 *   2. weight-for-age measurement ONLY IF a raw kg measurement is available
 *      (in this schema, `value` for weight-for-age is the z-score, NOT kg —
 *       so we deliberately do NOT fall back to it).
 */
const resolveWeightKg = (input: ClinicGenerationInput): number | null => {
  if (
    input.patient.weightKg !== undefined &&
    input.patient.weightKg !== null &&
    input.patient.weightKg > 0
  ) {
    return input.patient.weightKg;
  }

  return null;
};

/**
 * Throws GenerationError when the task cannot be safely completed without
 * a missing clinical parameter. Prevents the model from inventing values.
 */
const assertRequiredClinicalData = (input: ClinicGenerationInput): void => {
  if (input.taskKind === 'pediatric_dosing_safety') {
    const weightKg = resolveWeightKg(input);

    if (weightKg === null) {
      throw new GenerationError(
        'pediatric_dosing_safety requires patient.weightKg (current weight in kg) — refusing to guess from z-scores or birth weight.',
        { taskKind: input.taskKind },
      );
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────

export function buildSystemPrompt(input: ClinicGenerationInput): string {
  const isArabic = input.language === 'ar';

  return `You are an expert board-certified Pediatrician and Neonatologist serving as a Clinical Decision Support (CDS) assistant for outpatient pediatric practice.
You strictly adhere to evidence-based clinical guidelines (Nelson Textbook of Pediatrics, American Academy of Pediatrics [AAP], WHO IMCI, and Egyptian Ministry of Health / Egyptian Pediatric Association standards).

CRITICAL SAFETY & CLINICAL RULES:
1. Always distinguish age-appropriate norms. Neonates (0-28 days), young infants (1-3 months), older infants (3-12 months), toddlers (1-3 years), preschoolers (3-5 years), and school-age children/adolescents have vastly distinct vital signs, pharmacokinetics, and differential priorities.
2. Weight-based dosing: Always verify weight in kg. Distinguish mg/kg/dose from mg/kg/day clearly. Never recommend adult fixed doses for pediatric patients unless weight exceeds adult cutoff (>40-50 kg). If weight is not explicitly provided, DO NOT invent it — report the missing data instead.
3. Red flags: Always explicitly identify danger signs (e.g. lethargy, poor feeding, respiratory distress/grunting/retractions, cyanosis, dehydration, non-blanching purpuric rash, fever in neonate <28 days).
4. No autonomous diagnosis: All outputs are recommendations to be evaluated and signed by the licensed pediatrician.
5. No fabrication: Never invent lab values, vital signs, weights, dates, or physical exam findings that are not present in the patient context. If data is missing, list it in "concerns" or return an empty array — do not fill gaps.
6. Language: ${isArabic ? 'Output all human-facing summaries, home-care instructions, and communication in professional, clear, empathetic Arabic. Clinical terms may include international English abbreviations (e.g. SOAP sections, ICD-10 codes, drug names).' : 'Output in clear, precise medical English.'}
7. Format: You MUST respond ONLY with a valid JSON object matching the requested schema. No markdown code blocks, no extraneous explanatory text before or after the JSON.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task prompt
// ─────────────────────────────────────────────────────────────────────────────

const textOr = (value: string | null | undefined, fallback: string): string =>
  value !== undefined && value !== null && value !== '' ? value : fallback;

const buildPromptContext = (
  input: ClinicGenerationInput,
  ageDesc: string,
): string => {
  const patientLines: Array<string> = [
    `- Sex: ${input.patient.sex}`,
    `- Age: ${ageDesc}`,
  ];

  if (input.patient.weightKg !== undefined && input.patient.weightKg !== null) {
    patientLines.push(`- Current Weight: ${input.patient.weightKg} kg`);
  }

  if (
    input.patient.birthWeightKg !== undefined &&
    input.patient.birthWeightKg !== null
  ) {
    patientLines.push(
      `- Birth Weight: ${input.patient.birthWeightKg} kg, Gestational Age: ${
        input.patient.gestationalAgeWeeks ?? 'Term'
      } weeks`,
    );
  }

  patientLines.push(
    `- Documented Allergies: ${textOr(input.patient.allergies, 'No known allergies')}`,
  );

  let measurementsDesc = '';
  const { measurements } = input;

  if (measurements !== undefined && measurements.length > 0) {
    measurementsDesc = `\nMeasurements (z-score reference data, NOT raw values):\n${measurements
      .map(
        (m) =>
          ` - ${m.indicator}: value=${m.value}, z-score=${m.zScore ?? 'N/A'}`,
      )
      .join('\n')}`;
  }

  let context = `PATIENT CONTEXT:\n${patientLines.join('\n')}${measurementsDesc}`;

  if (input.visit !== undefined) {
    context += `\n\nVISIT OBSERVATIONS:
- Chief Complaint: ${textOr(input.visit.chiefComplaint, 'Unspecified')}
- Symptoms: ${textOr(input.visit.symptoms, 'None noted')}
- Physical Examination: ${textOr(input.visit.physicalExam, 'None recorded')}
- Plan / Working Impression: ${textOr(input.visit.plan, 'None recorded')}
- Clinician Scratch Notes: ${textOr(input.visit.notes, 'None')}`;
  }

  if (input.freeText !== undefined && input.freeText !== '') {
    context += `\n\nDOCTOR SCRATCHPAD / DICTATION:\n${input.freeText}`;
  }

  if (input.dosingQuery !== undefined) {
    context += `\n\nDOSING QUERY TO EVALUATE:
- Drug: ${input.dosingQuery.drugName}
- Proposed Dose: ${input.dosingQuery.proposedDose}
- Frequency: ${input.dosingQuery.frequency}
- Route: ${textOr(input.dosingQuery.route, 'Oral')}
- Intended Duration: ${
      input.dosingQuery.durationDays !== undefined &&
      input.dosingQuery.durationDays > 0
        ? `${input.dosingQuery.durationDays} days`
        : 'Not specified'
    }`;
  }

  return context;
};

export function buildTaskPrompt(input: ClinicGenerationInput): string {
  // Fail fast if required clinical data is missing.
  assertRequiredClinicalData(input);

  const ageDesc = formatSafeAge(input.patient.ageMonths);
  const context = buildPromptContext(input, ageDesc);

  switch (input.taskKind) {
    case 'soap_note': {
      return `${context}

TASK: Synthesize the observations and notes above into a professional pediatric SOAP note.
Return JSON with this exact schema:
{
  "subjective": "Structured HPI including onset, duration, fever curve, oral intake/hydration, urine output, activity level, associated respiratory/GI/skin symptoms",
  "objective": "Systematic physical exam findings organized by General Appearance, Vitals/Growth, HEENT, Respiratory/Chest, Cardiovascular, Abdomen, Neurological/Mental status, Skin/Extremities",
  "assessment": "Concise clinical impression with primary diagnosis and key pediatric differentials",
  "plan": "Comprehensive plan including diagnostic workup (if needed), supportive care (hydration/antipyretics), evidence-based medications with weight-based dosing, and specific follow-up timeline",
  "icd10Suggestions": [
    { "code": "e.g. J06.9", "description": "Acute upper respiratory infection, unspecified", "confidence": 0.95 }
  ],
  "redFlags": [
    "e.g. Inability to drink fluids or breastfeed",
    "e.g. Subcostal or intercostal retractions with tachypnea"
  ],
  "pediatricPearls": [
    "e.g. Avoid cough suppressants and OTC decongestants under 6 years of age"
  ],
  "disclaimer": "Clinical decision support advisory only. The treating physician retains sole responsibility for diagnosis and prescribing."
}`;
    }

    case 'patient_education': {
      return `${context}

TASK: Generate bilingual parent/guardian home-care discharge guidance for this child.
Language: ${input.language === 'ar' ? 'Arabic' : 'English'}.
Return JSON with this exact schema:
{
  "title": "Clear friendly title, e.g. إرشادات العناية بالطفل: نزلة البرد والتهاب الحلق",
  "summary": "Simple, empathetic explanation of the condition for the parents",
  "homeCareSteps": [
    "e.g. إراحة الطفل التامة في مكان جيد التهوية",
    "e.g. تنظيف الأنف بمحلول الملح الفسيولوجي قبل الرضاعة والنوم"
  ],
  "feedingAndFluids": "Practical instructions on maintaining breastfeeding/milk and encouraging small, frequent fluids to prevent dehydration",
  "medicationGuidance": "Clear instructions on how and when to give prescribed medications and antipyretics",
  "dangerSignsToSeekEmergency": [
    "علامات الخطورة التي تستوجب التوجه الفوري للطوارئ:",
    "صعوبة في التنفس أو سرعة غير طبيعية في التنفس أو اتساع فتحتي الأنف",
    "الخمول الشديد أو صعوبة إيقاظ الطفل",
    "رفض الرضاعة أو القيء المستمر وعدم التبول لأكثر من 6 ساعات",
    "ظهور طفح جلدي لونه أحمر داكن أو بنفسجي لا يزول بالضغط"
  ],
  "expectedRecoveryTimeline": "e.g. من المتوقع تحسن الأعراض خلال 3 إلى 5 أيام",
  "language": "${input.language ?? 'ar'}",
  "readingLevel": "parents"
}`;
    }

    case 'pediatric_dosing_safety': {
      // Guaranteed non-null by assertRequiredClinicalData() above.
      const weightKg = resolveWeightKg(input);

      return `${context}

TASK: Perform a clinical pharmacology and dosing safety check for the requested drug based on the child's exact current weight (${weightKg} kg) and age (${ageDesc}).
Use ONLY the weight provided above (${weightKg} kg). Do NOT use any z-score as a weight value.
Return JSON with this exact schema:
{
  "drugName": "Medication generic and common brand name",
  "proposedDose": "Proposed dose from query",
  "weightKg": ${weightKg},
  "ageMonths": ${input.patient.ageMonths},
  "standardDoseRange": "e.g. 10 to 15 mg/kg/dose every 4 to 6 hours",
  "doseUnit": "mg/kg/dose",
  "isDoseWithinRange": true,
  "maxRecommendedDailyDose": "e.g. Max 60-75 mg/kg/day or 4000 mg/day",
  "warnings": [
    "e.g. Check combination products to avoid accidental paracetamol double-dosing"
  ],
  "neonatalConsiderations": "Specific considerations if patient <1 month",
  "organAdjustment": "Renal or hepatic dosing cautions if applicable",
  "clinicalVerdict": "appropriate",
  "disclaimer": "Independent dosing calculation tool. The prescribing physician must verify all doses before administration."
}`;
    }

    case 'growth_interpretation': {
      return `${context}

TASK: Provide an expert pediatric growth and nutritional evaluation based on the child's age (${ageDesc}) and recorded anthropometric measurements.
Return JSON with this exact schema:
{
  "summary": "Overall growth evaluation comparing weight, length/height, and head circumference percentiles against WHO/Egyptian standards",
  "weightStatus": "e.g. Normal weight-for-age (between 25th and 50th percentile, z-score -0.3)",
  "heightStatus": "e.g. Normal length-for-age",
  "headCircumferenceStatus": "e.g. Normocephalic",
  "falteringGrowthRisk": false,
  "concerns": [],
  "nutritionalCounseling": [
    "Age-appropriate feeding, exclusive breastfeeding or complementary foods introduction guidance",
    "Vitamin D3 / Iron supplementation status reminders"
  ],
  "anticipatoryMilestones": [
    "Key motor, speech, and social milestones expected in the next 1-3 months"
  ],
  "recommendedFollowUpWeeks": 4
}`;
    }

    case 'differential_dx': {
      return `${context}

TASK: Formulate a prioritized pediatric differential diagnosis list with clinical reasoning.
Return JSON with this exact schema:
{
  "differentials": [
    {
      "diagnosis": "Diagnosis name",
      "icd10": "ICD-10 code",
      "likelihood": "high",
      "supportingFindings": ["Finding 1", "Finding 2"],
      "againstFindings": ["Finding that makes this less likely"],
      "nextSteps": ["Specific lab, imaging, or bedside test to confirm or rule out"]
    }
  ],
  "redFlags": ["Critical pediatric symptoms to monitor"],
  "disclaimer": "Differential suggestions for physician evaluation only."
}`;
    }

    case 'immunization_advice': {
      return `${context}

TASK: Evaluate the child's immunization status based on the Egyptian Ministry of Health (MOH) mandatory childhood schedule and provide catch-up guidance.
Return JSON with this exact schema:
{
  "dueNow": [
    { "vaccine": "e.g. Pentavalent + OPV", "doseNumber": 2, "reason": "Due at 4 months" }
  ],
  "upcoming": [
    { "vaccine": "e.g. Pentavalent + OPV + PCV", "dueWithinDays": 60 }
  ],
  "contraindications": ["e.g. Postpone live vaccines if currently receiving immunosuppressive therapy or severe febrile illness"],
  "notes": "General schedule recommendations and parent advice"
}`;
    }

    case 'follow_up_questions': {
      return `${context}

TASK: Generate a high-yield clinical history checklist of questions the pediatrician should ask the parent to narrow down the differential.
Return JSON with this exact schema:
{
  "questions": [
    {
      "question": "Clear clinical question to ask parent",
      "rationale": "Why this question is clinically critical for this presentation"
    }
  ]
}`;
    }

    default: {
      const _exhaustive: never = input.taskKind;
      throw new Error(`Unsupported task kind: ${String(_exhaustive)}`);
    }
  }
}
