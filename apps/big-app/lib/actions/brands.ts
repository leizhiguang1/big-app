"use server";

import { revalidatePath } from "next/cache";
import { getServerContext } from "@/lib/context/server";
import * as brandsService from "@/lib/services/brands";

export async function updateBrandAction(input: unknown) {
	const ctx = await getServerContext();
	const brand = await brandsService.updateBrand(ctx, input);
	revalidatePath("/o/[outlet]/config/general", "page");
	return brand;
}
