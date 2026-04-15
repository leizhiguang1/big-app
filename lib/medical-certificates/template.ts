/**
 * Fixed letterhead constants for the Medical Certificate print view.
 *
 * TODO (later): move to a per-outlet `letterhead` JSONB column on `outlets`
 * once Config → Outlets ships a Letterhead editor. For now every MC renders
 * with the same header regardless of which outlet issued it. Update this
 * file when the clinic sends their real company name + registration number
 * + logo.
 */

export const CLINIC_HEADER = {
	groupName: "BIG DENTAL GROUP SDN BHD",
	registrationNumber: "(1632410-U)",
	logoPath: "/mc-logo.svg", // placeholder — swap the file in public/
} as const;

export const MC_FOOTER_NOTE = "*Not valid for absence from court case";
