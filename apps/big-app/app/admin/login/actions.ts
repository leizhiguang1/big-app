"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Apex sign-in for platform admins. Tenant `/login` lives at
// `<brand>.bigapp.online/login` and gates by employees-row membership;
// this one lives at `bigapp.online/admin/login` and gates by
// `platform_admins` row. The two flows must NOT be merged: a brand
// admin who isn't a platform admin must not be able to reach `/admin`,
// and a platform admin who isn't a member of any brand can still sign in
// here without faking brand membership.

export type AdminLoginResult =
	| { error: string; email: string; password: string }
	| { ok: true };

export async function adminLoginAction(
	_prev: AdminLoginResult | null,
	formData: FormData,
): Promise<AdminLoginResult> {
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
			error: signInError?.message ?? "Invalid credentials",
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
			error: "This account isn't a platform admin.",
			email,
			password,
		};
	}

	redirect("/admin/brands");
}
