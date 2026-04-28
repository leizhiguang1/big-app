import type { Context } from "@/lib/context/types";
import { UnauthorizedError } from "@/lib/errors";

export function assertBrandId(ctx: Context): string {
	if (!ctx.brandId) throw new UnauthorizedError("Brand context required");
	return ctx.brandId;
}
