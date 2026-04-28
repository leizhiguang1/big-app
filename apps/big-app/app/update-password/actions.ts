"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UpdatePasswordResult = { error: string } | { ok: true };

export async function updatePasswordAction(
	_prev: UpdatePasswordResult | null,
	formData: FormData,
): Promise<UpdatePasswordResult> {
	const password = String(formData.get("password") ?? "");
	const confirm = String(formData.get("password_confirm") ?? "");

	if (!password || password.length < 8) {
		return { error: "Password must be at least 8 characters" };
	}
	if (password !== confirm) {
		return { error: "Passwords do not match" };
	}

	const db = await createClient();
	const { error } = await db.auth.updateUser({ password });

	if (error) {
		return { error: error.message };
	}

	redirect("/dashboard");
}
