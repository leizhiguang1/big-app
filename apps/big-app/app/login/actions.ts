"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginResult =
	| { error: string; email: string; password: string }
	| { ok: true };

export async function loginAction(
	_prev: LoginResult | null,
	formData: FormData,
): Promise<LoginResult> {
	const email = String(formData.get("email") ?? "").trim();
	const password = String(formData.get("password") ?? "");

	if (!email || !password) {
		return { error: "Email and password are required", email, password };
	}

	const h = await headers();
	const brandId = h.get("x-brand-id");
	if (!brandId) {
		return {
			error: "Sign in from your workspace's URL (e.g. <name>.bigapp.online).",
			email,
			password,
		};
	}

	const db = await createClient();
	const { data: signIn, error: signInError } = await db.auth.signInWithPassword(
		{ email, password },
	);
	if (signInError || !signIn.user) {
		return {
			error: signInError?.message ?? "Invalid credentials",
			email,
			password,
		};
	}

	const dbAdmin = createSupabaseAdminClient();
	const { data: employee } = await dbAdmin
		.from("employees")
		.select("id, is_active, web_login_enabled")
		.eq("auth_user_id", signIn.user.id)
		.eq("brand_id", brandId)
		.maybeSingle();

	if (!employee) {
		await db.auth.signOut();
		return {
			error: "Your account doesn't have access to this workspace.",
			email,
			password,
		};
	}

	if (!employee.is_active || !employee.web_login_enabled) {
		await db.auth.signOut();
		return {
			error: "Your account is not allowed to sign in",
			email,
			password,
		};
	}

	redirect("/dashboard");
}
