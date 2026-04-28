import type { LeadSource } from "@/lib/schemas/appointments";
import type { CustomerInput } from "@/lib/schemas/customers";

export function buildLeadPrefill(args: {
	leadName: string | null | undefined;
	leadPhone: string | null | undefined;
	leadSource: LeadSource | null | undefined;
	leadAttendedById: string | null | undefined;
	outletId: string;
	fallbackConsultantId: string | null;
}): Partial<CustomerInput> {
	const parts = (args.leadName ?? "").trim().split(/\s+/);
	const first = parts[0] ?? "";
	const last = parts.slice(1).join(" ");
	const consultantId =
		args.leadAttendedById ?? args.fallbackConsultantId ?? undefined;
	return {
		first_name: first,
		last_name: last || undefined,
		phone: args.leadPhone ?? "",
		home_outlet_id: args.outletId,
		consultant_id: consultantId,
		source: args.leadSource ?? null,
	};
}
