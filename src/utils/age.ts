export { calculateAgeString } from "@/lib/dates";
export function getTargetAgeMonths(
	vaccineCode: string,
	doseNumber: number
): number {
	if (vaccineCode === "BCG" || vaccineCode === "HepB_Birth") return 0;
	if (
		vaccineCode === "Pentavalent" ||
		vaccineCode === "OPV" ||
		vaccineCode === "IPV"
	) {
		if (doseNumber === 1) return 2;
		if (doseNumber === 2) return 4;
		if (doseNumber === 3) return 6;
		return 18;
	}
	if (vaccineCode === "MMR") return doseNumber === 1 ? 12 : 18;
	if (vaccineCode === "VitA") return doseNumber === 1 ? 9 : 18;
	return 0;
}
