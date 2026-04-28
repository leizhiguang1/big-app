"use client";

import { useActionState } from "react";
import {
	type PlatformAdminLoginResult,
	platformAdminLoginAction,
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlatformAdminLoginForm() {
	const [state, formAction, pending] = useActionState<
		PlatformAdminLoginResult | null,
		FormData
	>(platformAdminLoginAction, null);

	const error = state && "error" in state ? state.error : null;
	const prevEmail = state && "email" in state ? state.email : "";

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="admin-email" className="font-medium text-sm">
					Email
				</label>
				<Input
					id="admin-email"
					name="email"
					type="email"
					autoComplete="email"
					defaultValue={prevEmail}
					key={`email-${prevEmail}`}
					required
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor="admin-password" className="font-medium text-sm">
					Password
				</label>
				<Input
					id="admin-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
			</div>
			{error && <p className="text-destructive text-sm">{error}</p>}
			<Button type="submit" disabled={pending}>
				{pending ? "Signing in…" : "Sign in"}
			</Button>
		</form>
	);
}
