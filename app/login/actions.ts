"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginResult = { error: string } | { ok: true };

export async function loginAction(
	_prev: LoginResult | null,
	formData: FormData,
): Promise<LoginResult> {
	const email = String(formData.get("email") ?? "").trim();
	const password = String(formData.get("password") ?? "");

	if (!email || !password) {
		return { error: "Email and password are required" };
	}

	const db = await createClient();
	const { data: signIn, error: signInError } = await db.auth.signInWithPassword(
		{ email, password },
	);
	if (signInError || !signIn.user) {
		return { error: signInError?.message ?? "Invalid credentials" };
	}

	const dbAdmin = createSupabaseAdminClient();
	const { data: employee } = await dbAdmin
		.from("employees")
		.select("id, is_active, web_login_enabled")
		.eq("auth_user_id", signIn.user.id)
		.maybeSingle();

	if (!employee?.is_active || !employee.web_login_enabled) {
		await db.auth.signOut();
		return { error: "Your account is not allowed to sign in" };
	}

	redirect("/dashboard");
}
