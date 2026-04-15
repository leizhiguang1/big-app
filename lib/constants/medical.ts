export const SMOKER_OPTIONS = ["yes", "no", "occasionally"] as const;
export type SmokerStatus = (typeof SMOKER_OPTIONS)[number];

export const SMOKER_LABELS: Record<SmokerStatus, string> = {
	yes: "Yes",
	no: "No",
	occasionally: "Occasionally",
};

// Fixed for v1. When a user asks for custom conditions, promote to a
// lookup table in Settings.
export const MEDICAL_CONDITIONS = [
	"POST RADIATION",
	"HEART RELATED DISEASES",
	"LIVER RELATED DISEASES",
	"KIDNEY RELATED DISEASES",
	"BLOOD RELATED DISEASES",
	"HYPERTENSION",
	"ALLERGIC REACTION",
	"CHOLESTEROL",
	"DIABETIC",
] as const;

export type MedicalCondition = (typeof MEDICAL_CONDITIONS)[number];
