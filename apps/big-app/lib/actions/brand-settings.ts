"use server";

import { revalidatePath } from "next/cache";
import type { BrandSettingKey } from "@/lib/brand-config/settings";
import { getServerContext } from "@/lib/context/server";
import * as brandSettingsService from "@/lib/services/brand-settings";

function revalidate() {
	revalidatePath("/o/[outlet]/config/appointments", "page");
	revalidatePath("/o/[outlet]/config/customers", "page");
	revalidatePath("/o/[outlet]/config/sales", "page");
	revalidatePath("/o/[outlet]/appointments", "page");
}

export async function setBrandSettingAction(key: string, value: unknown) {
	const ctx = await getServerContext();
	const validKey: BrandSettingKey =
		brandSettingsService.assertBrandSettingKey(key);
	// biome-ignore lint/suspicious/noExplicitAny: runtime-keyed set, typed at write
	await brandSettingsService.setBrandSetting(ctx, validKey, value as any);
	revalidate();
}
