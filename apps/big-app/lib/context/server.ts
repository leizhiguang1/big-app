import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Context, CurrentUser } from "./types";

export const getServerContext = cache(async (): Promise<Context> => {
	const db = await createClient();
	const dbAdmin = createSupabaseAdminClient();

	const reqHeaders = await headers();
	const brandIdFromHost = reqHeaders.get("x-brand-id");

	let currentUser: CurrentUser | null = null;
	const {
		data: { user: authUser },
	} = await db.auth.getUser();

	if (authUser) {
		if (brandIdFromHost) {
			const { data: employee } = await dbAdmin
				.from("employees")
				.select("id, email")
				.eq("auth_user_id", authUser.id)
				.eq("brand_id", brandIdFromHost)
				.maybeSingle();
			currentUser = {
				id: authUser.id,
				employeeId: employee?.id ?? null,
				email: authUser.email ?? employee?.email ?? "",
			};
		} else {
			currentUser = {
				id: authUser.id,
				employeeId: null,
				email: authUser.email ?? "",
			};
		}
	}

	return {
		db,
		dbAdmin,
		currentUser,
		brandId: brandIdFromHost,
		outletIds: [],
		requestId: randomUUID(),
	};
});
