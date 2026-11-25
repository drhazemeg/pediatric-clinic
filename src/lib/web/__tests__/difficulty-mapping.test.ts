// apps/web/src/lib/__tests__/difficulty-mapping.test.ts
import { describe, expect, it } from "bun:test";
import {
	clampTriageLevel,
	getDifficultyLabel,
	TRIAGE_ACUITY_LEVELS
} from "../difficulty-mapping";

describe("TRIAGE_ACUITY_LEVELS", () => {
	it("has entries for all 5 pediatric acuity levels", () => {
		expect(Object.keys(TRIAGE_ACUITY_LEVELS)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5"
		]);
	});

	it("defines code, English label, and Arabic label for each level", () => {
		for (const level of [1, 2, 3, 4, 5] as const) {
			const descriptor = TRIAGE_ACUITY_LEVELS[level];
			expect(descriptor.level).toBe(level);
			expect(descriptor.code.length).toBeGreaterThan(0);
			expect(descriptor.labelEn.length).toBeGreaterThan(0);
			expect(descriptor.labelAr.length).toBeGreaterThan(0);
		}
	});
});

describe("clampTriageLevel", () => {
	it("clamps values below 1 to 1 and above 5 to 5", () => {
		expect(clampTriageLevel(-3)).toBe(1);
		expect(clampTriageLevel(0)).toBe(1);
		expect(clampTriageLevel(6)).toBe(5);
		expect(clampTriageLevel(99)).toBe(5);
	});

	it("rounds intermediate numbers to the nearest acuity level", () => {
		expect(clampTriageLevel(2.4)).toBe(2);
		expect(clampTriageLevel(3.6)).toBe(4);
	});
});

describe("getDifficultyLabel", () => {
	it("returns English labels by default", () => {
		expect(getDifficultyLabel("triage", 1)).toBe("Routine Well-Child");
		expect(getDifficultyLabel("triage", 4)).toBe("Urgent Triage");
		expect(getDifficultyLabel("triage", 5)).toBe("High Acuity / Priority");
	});

	it("returns Arabic labels when locale is 'ar'", () => {
		expect(getDifficultyLabel("triage", 1, "ar")).toBe("متابعة روتينية");
		expect(getDifficultyLabel("triage", 4, "ar")).toBe("فرز عاجل");
		expect(getDifficultyLabel("triage", 5, "ar")).toBe("أولوية قصوى");
	});

	it("clamps out-of-range levels safely", () => {
		expect(getDifficultyLabel("triage", 0, "en")).toBe("Routine Well-Child");
		expect(getDifficultyLabel("triage", 99, "ar")).toBe("أولوية قصوى");
	});
});
