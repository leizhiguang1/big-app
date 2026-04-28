export const PAYMENT_BANKS = [
	"AEON",
	"Affin",
	"Alliance",
	"AmBank",
	"Bank Islam",
	"Bank Rakyat",
	"CIMB",
	"Citibank",
	"Hong Leong",
	"HSBC",
	"Maybank",
	"OCBC",
	"Public Bank",
	"RHB",
	"Standard Chartered",
	"UOB",
	"Others",
] as const;

export const PAYMENT_CARD_TYPES = ["Visa", "Master", "Amex", "Others"] as const;

export const PAYMENT_EPS_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48, 60] as const;

export type PaymentBank = (typeof PAYMENT_BANKS)[number];
export type PaymentCardType = (typeof PAYMENT_CARD_TYPES)[number];
export type PaymentEpsMonths = (typeof PAYMENT_EPS_MONTHS)[number];
