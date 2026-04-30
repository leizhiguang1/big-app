"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Two login flows live behind one path (`/login`) and branch on host:
//   * Apex (no `x-brand-id`)  → platformAdminLoginAction; gates on platform_admins.
//   * Brand subdomain         → loginAction; gates on employees membership.
// `app/login/page.tsx` picks which form to render based on the same header.

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
			error: "Invalid credentials",
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
			error: "Invalid credentials",
			email,
			password,
		};
	}

	if (!employee.is_active || !employee.web_login_enabled) {
		await db.auth.signOut();
		return {
			error: "Invalid credentials",
			email,
			password,
		};
	}

	redirect("/");
}

export type PlatformAdminLoginResult =
	| { error: string; email: string; password: string }
	| { ok: true };

export async function platformAdminLoginAction(
	_prev: PlatformAdminLoginResult | null,
	formData: FormData,
): Promise<PlatformAdminLoginResult> {
	const email = String(formData.get("email") ?? "").trim();
	const password = String(formData.get("password") ?? "");

	if (!email || !password) {
		return { error: "Email and password are required", email, password };
	}

	const db = await createClient();
	const { data: signIn, error: signInError } =
		await db.auth.signInWithPassword({ email, password });
	if (signInError || !signIn.user) {
		return {
			error: "Invalid credentials",
			email,
			password,
		};
	}

	const dbAdmin = createSupabaseAdminClient();
	const { data: admin } = await dbAdmin
		.from("platform_admins")
		.select("auth_user_id")
		.eq("auth_user_id", signIn.user.id)
		.maybeSingle();

	if (!admin) {
		await db.auth.signOut();
		return {
			error: "Invalid credentials",
			email,
			password,
		};
	}

	redirect("/admin/brands");
}
