import { describe, expect, it } from "bun:test";
import {
	deidentifyClinicData,
	formatSafeAge,
	sanitizeClinicalText
} from "../deidentify";
import type { ClinicGenerationInput } from "../schemas";

describe("PHI De-identification & Minimization", () => {
	it("formats age into safe descriptions without date of birth", () => {
		expect(formatSafeAge(0.5)).toContain("days");
		expect(formatSafeAge(6)).toBe("6 months");
		expect(formatSafeAge(18)).toBe("18 months");
		expect(formatSafeAge(36)).toBe("3 years");
		expect(formatSafeAge(42)).toBe("3 years 6 months");
	});

	it("sanitizes clinical text with phone numbers and IDs", () => {
		const raw =
			"Mother phone is 01012345678, national ID 29810150102345, MRN #123456, email parent@example.com";
		const cleaned = sanitizeClinicalText(raw);

		expect(cleaned).not.toContain("01012345678");
		expect(cleaned).not.toContain("29810150102345");
		expect(cleaned).not.toContain("parent@example.com");
		expect(cleaned).toContain("[PHONE_REDACTED]");
		expect(cleaned).toContain("[NAT_ID_REDACTED]");
		expect(cleaned).toContain("[EMAIL_REDACTED]");
	});

	it("de-identifies patient input before AI call", () => {
		const input: ClinicGenerationInput = {
			taskKind: "soap_note",
			apiKeyConfig: {
				baseUrl: "http://localhost:11434/v1",
				apiKey: "test-key",
				model: "meta-llama/Llama-3-70b-Instruct"
			},
			patient: {
				id: "patient-uuid-12345",
				sex: "female",
				dateOfBirth: "2024-05-15",
				ageMonths: 18,
				allergies: "Call father 01223456789 if penicillin reaction"
			},
			visit: {
				id: "visit-uuid-9999",
				visitedAt: "2025-11-20T10:00:00Z",
				chiefComplaint: "Fever and cough",
				notes: "National ID on file: 29810150102345"
			}
		};

		const scrubbed = deidentifyClinicData(input);

		expect(scrubbed.patient.id).toBe("ANONYMIZED_PATIENT");
		expect(scrubbed.patient.dateOfBirth).toBe("REDACTED");
		expect(scrubbed.patient.allergies).not.toContain("01223456789");
		expect(scrubbed.visit?.id).toBe("ANONYMIZED_VISIT");
		expect(scrubbed.visit?.notes).not.toContain("29810150102345");
		expect(scrubbed.patient.ageMonths).toBe(18); // Clinically essential parameters preserved
		expect(scrubbed.patient.sex).toBe("female");
	});
});
