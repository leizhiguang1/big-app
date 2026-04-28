import { randomUUID } from "node:crypto";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Context, CurrentUser } from "./types";

export const getServerContext = cache(async (): Promise<Context> => {
	const db = await createClient();
	const dbAdmin = createSupabaseAdminClient();

	let currentUser: CurrentUser | null = null;
	let brandId: string | null = null;
	const {
		data: { user: authUser },
	} = await db.auth.getUser();

	if (authUser) {
		const { data: employee } = await dbAdmin
			.from("employees")
			.select("id, email, brand_id")
			.eq("auth_user_id", authUser.id)
			.maybeSingle();
		currentUser = {
			id: authUser.id,
			employeeId: employee?.id ?? null,
			email: authUser.email ?? employee?.email ?? "",
		};
		brandId = employee?.brand_id ?? null;
	}

	return {
		db,
		dbAdmin,
		currentUser,
		brandId,
		outletIds: [],
		requestId: randomUUID(),
	};
});
