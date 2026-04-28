"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { type LoginResult, loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
	const [state, formAction, pending] = useActionState<
		LoginResult | null,
		FormData
	>(loginAction, null);

	const emailRef = useRef<HTMLInputElement>(null);
	const error = state && "error" in state ? state.error : null;
	const prevEmail = state && "email" in state ? state.email : "";
	const prevPassword = state && "password" in state ? state.password : "";

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="login-email" className="font-medium text-sm">
					Email
				</label>
				<Input
					ref={emailRef}
					id="login-email"
					name="email"
					type="email"
					autoComplete="email"
					defaultValue={prevEmail}
					key={`email-${prevEmail}`}
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
					defaultValue={prevPassword}
					key={`password-${prevPassword}`}
					required
				/>
			</div>
			{error && <p className="text-destructive text-sm">{error}</p>}
			<Button type="submit" disabled={pending}>
				{pending ? "Signing in…" : "Sign in"}
			</Button>
			<p className="text-center">
				<Link
					href="/forgot-password"
					className="text-muted-foreground text-xs hover:text-primary hover:underline"
					onClick={(e) => {
						const email = emailRef.current?.value?.trim();
						if (email) {
							e.preventDefault();
							window.location.href = `/forgot-password?email=${encodeURIComponent(email)}`;
						}
					}}
				>
					Forgot password?
				</Link>
			</p>
		</form>
	);
}
