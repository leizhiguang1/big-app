import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Context, CurrentUser } from "./types";

export async function getServerContext(): Promise<Context> {
	const db = await createClient();
	const dbAdmin = createSupabaseAdminClient();

	let currentUser: CurrentUser | null = null;
	const {
		data: { user: authUser },
	} = await db.auth.getUser();

	if (authUser) {
		const { data: employee } = await dbAdmin
			.from("employees")
			.select("id, email")
			.eq("auth_user_id", authUser.id)
			.maybeSingle();
		currentUser = {
			id: authUser.id,
			employeeId: employee?.id ?? null,
			email: authUser.email ?? employee?.email ?? "",
		};
	}

	return {
		db,
		dbAdmin,
		currentUser,
		outletIds: [],
		requestId: randomUUID(),
	};
}
