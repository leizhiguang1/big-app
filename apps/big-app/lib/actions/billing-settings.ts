"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as billingSettingsService from "@/lib/services/billing-settings";

export async function updateBillingSettingsAction(input: unknown) {
	const ctx = await getServerContext();
	const settings = await billingSettingsService.updateBillingSettings(
		ctx,
		input,
	);
	revalidatePath("/config/sales");
	return settings;
}
