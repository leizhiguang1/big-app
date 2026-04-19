import { DEFAULT_COUNTRY_CODE } from "@/lib/constants/countries";

type CustomerLike = {
	id_type: string | null;
	country_of_origin: string | null;
};

type BillingSettingsLike = {
	auto_foreign_tax_enabled: boolean;
	local_tax_id: string | null;
	foreign_tax_id: string | null;
};

export function isForeignCustomer(customer: CustomerLike | null): boolean {
	if (!customer) return false;
	if (customer.id_type === "ic") return false;
	const code = customer.country_of_origin?.trim().toUpperCase();
	if (code && code !== DEFAULT_COUNTRY_CODE) return true;
	if (customer.id_type === "passport") return true;
	return false;
}

export function resolveDefaultTaxId(
	customer: CustomerLike | null,
	settings: BillingSettingsLike | null,
): string | null {
	if (!settings) return null;
	if (settings.auto_foreign_tax_enabled && isForeignCustomer(customer)) {
		return settings.foreign_tax_id ?? settings.local_tax_id ?? null;
	}
	return settings.local_tax_id ?? null;
}
