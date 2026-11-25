import { OpenAICompatibleClient } from "./client";
import { deidentifyClinicData } from "./deidentify";
import { GenerationError } from "./errors";
import { buildSystemPrompt, buildTaskPrompt } from "./prompts";
import {
	type ClinicAiResult,
	type ClinicGenerationInput,
	differentialDxSchema,
	followUpQuestionsSchema,
	growthInterpretationSchema,
	immunizationAdviceSchema,
	patientEducationSchema,
	pediatricDosingSafetySchema,
	soapNoteSchema,
	type TaskKind
} from "./schemas";

export const HIGH_STAKES_TASKS = new Set<TaskKind>([
	"soap_note",
	"differential_dx",
	"pediatric_dosing_safety"
]);

export interface SafetyCritiqueConfig {
	model: string;
	maxTokens?: number;
}

export interface SafetyCritiqueResult<T extends TaskKind = TaskKind> {
	isSafe: boolean;
	concerns: string[];
	tokensUsed: number;
	taskKind: T;
}

function parseJsonObject(rawContent: string, tokensUsed: number): unknown {
	const cleaned = rawContent
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();

	try {
		return JSON.parse(cleaned);
	} catch (err) {
		throw new GenerationError(
			`Failed to parse AI output as JSON: ${err instanceof Error ? err.message : String(err)}`,
			{ tokensUsed }
		);
	}
}

/**
 * Execute a pediatric clinical AI task through a secure provider with
 * automatic pre-flight de-identification and structured Zod output validation.
 */
export async function executeClinicAi(
	input: ClinicGenerationInput
): Promise<ClinicAiResult> {
	const startTime = Date.now();

	// 1. Enforce pre-flight data minimization and de-identification
	const deidentified = deidentifyClinicData(input);

	// 2. Build system and user task prompts
	const systemPrompt = buildSystemPrompt(deidentified);
	const userPrompt = buildTaskPrompt(deidentified);

	const client = new OpenAICompatibleClient(
		input.apiKeyConfig.baseUrl,
		input.apiKeyConfig.apiKey
	);

	let completion;
	try {
		completion = await client.chatCompletion({
			model: input.apiKeyConfig.model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt }
			],
			temperature: 0.2,
			max_tokens: input.apiKeyConfig.maxTokens ?? 4096,
			response_format: { type: "json_object" }
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new GenerationError(`AI generation request failed: ${message}`);
	}

	const durationMs = Date.now() - startTime;
	const tokensUsed = completion.usage?.total_tokens ?? 0;
	const rawContent = completion.content?.trim();

	if (!rawContent) {
		throw new GenerationError("AI returned an empty response", { tokensUsed });
	}

	const parsedJson = parseJsonObject(rawContent, tokensUsed);

	const meta = {
		model: input.apiKeyConfig.model,
		tokensUsed,
		durationMs,
		taskKind: input.taskKind
	};

	switch (input.taskKind) {
		case "soap_note": {
			const data = soapNoteSchema.parse(parsedJson);
			return { taskKind: "soap_note", data, meta };
		}
		case "patient_education": {
			const data = patientEducationSchema.parse(parsedJson);
			return { taskKind: "patient_education", data, meta };
		}
		case "differential_dx": {
			const data = differentialDxSchema.parse(parsedJson);
			return { taskKind: "differential_dx", data, meta };
		}
		case "pediatric_dosing_safety": {
			const data = pediatricDosingSafetySchema.parse(parsedJson);
			return { taskKind: "pediatric_dosing_safety", data, meta };
		}
		case "growth_interpretation": {
			const data = growthInterpretationSchema.parse(parsedJson);
			return { taskKind: "growth_interpretation", data, meta };
		}
		case "immunization_advice": {
			const data = immunizationAdviceSchema.parse(parsedJson);
			return { taskKind: "immunization_advice", data, meta };
		}
		case "follow_up_questions": {
			const data = followUpQuestionsSchema.parse(parsedJson);
			return { taskKind: "follow_up_questions", data, meta };
		}
		default: {
			const _exhaustive: never = input.taskKind;
			throw new Error(`Unsupported task kind: ${_exhaustive}`);
		}
	}
}

export async function runSafetyCritique<T extends TaskKind>(
	client: OpenAICompatibleClient,
	taskKind: T,
	patientContext: string,
	draft: unknown,
	config: SafetyCritiqueConfig
): Promise<SafetyCritiqueResult<T>> {
	const prompt = `You are a strict pediatric clinical safety reviewer.

PATIENT:
${patientContext}

DRAFT ${taskKind.toUpperCase()}:
${JSON.stringify(draft, null, 2)}

Check for:
1. Dangerous omissions (missing red flags, missed contraindications).
2. Hallucinated facts (ICD-10 codes, lab values, doses, dates not present in patient data).
3. Dosing errors (dose outside mg/kg range, wrong frequency, adult dose for child).
4. Unsafe advice (e.g., recommending OTC cough suppressant for infant under 2 years, live vaccine for immunocompromised).

Return JSON: {"isSafe": true, "concerns": ["..."]}`;

	let completion;
	try {
		completion = await client.chatCompletion({
			model: config.model,
			messages: [
				{
					role: "system",
					content:
						"You are a strict pediatric clinical safety reviewer. Return JSON only."
				},
				{ role: "user", content: prompt }
			],
			temperature: 0.1,
			max_tokens: Math.min(config.maxTokens ?? 1500, 1500),
			response_format: { type: "json_object" }
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new GenerationError(`Safety critique request failed: ${message}`);
	}

	const tokensUsed = completion.usage?.total_tokens ?? 0;
	const rawContent = completion.content?.trim();

	if (!rawContent) {
		throw new GenerationError("Safety critique returned an empty response", {
			tokensUsed
		});
	}

	const parsed = parseJsonObject(rawContent, tokensUsed);
	const record =
		typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: {};

	return {
		isSafe: record.isSafe === true,
		concerns: Array.isArray(record.concerns) ? record.concerns.map(String) : [],
		tokensUsed,
		taskKind
	};
}
