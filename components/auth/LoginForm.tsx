"use client";

import { useActionState } from "react";
import { type LoginResult, loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
	const [state, formAction, pending] = useActionState<
		LoginResult | null,
		FormData
	>(loginAction, null);

	const error = state && "error" in state ? state.error : null;

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="login-email" className="font-medium text-sm">
					Email
				</label>
				<Input
					id="login-email"
					name="email"
					type="email"
					autoComplete="email"
					required
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor="login-password" className="font-medium text-sm">
					Password
				</label>
				<Input
					id="login-password"
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
