import { z } from "zod";

export const PASSCODE_FUNCTIONS = [
	"CREATE_CUSTOMER_EMPLOYEE",
	"EDIT_CUSTOMER_EMPLOYEE",
	"VIEW_CUSTOMER",
	"REDEMPTION_BYPASS_FULL_PAYMENT",
	"REDEMPTION_REDEEM_EXPIRED_ITEM",
	"VOID_SALES_ORDER_INVOICE",
	"REFUND_PARTIAL_FULL_WALLET",
] as const;

export type PasscodeFunction = (typeof PASSCODE_FUNCTIONS)[number];

export const PASSCODE_FUNCTION_LABELS: Record<PasscodeFunction, string> = {
	CREATE_CUSTOMER_EMPLOYEE: "[CREATE] Customer/Employee",
	EDIT_CUSTOMER_EMPLOYEE: "[EDIT] Customer/Employee",
	VIEW_CUSTOMER: "[VIEW] Customer",
	REDEMPTION_BYPASS_FULL_PAYMENT:
		"[REDEMPTION] Bypass Full Payment Requirement",
	REDEMPTION_REDEEM_EXPIRED_ITEM: "[REDEMPTION] Redeem Expired Item",
	VOID_SALES_ORDER_INVOICE: "[VOID/REVERT] Sales Order/Invoice",
	REFUND_PARTIAL_FULL_WALLET: "[REFUND] Partial/Full Wallet Refund",
};

export const passcodeInputSchema = z.object({
	outlet_id: z.string().uuid("Outlet is required"),
	function: z.enum(PASSCODE_FUNCTIONS),
});

export type PasscodeInput = z.infer<typeof passcodeInputSchema>;
