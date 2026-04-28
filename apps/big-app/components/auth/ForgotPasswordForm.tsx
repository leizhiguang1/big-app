"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
	type ForgotPasswordResult,
	forgotPasswordAction,
} from "@/app/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm({
	initialEmail,
}: { initialEmail?: string }) {
	const [state, formAction, pending] = useActionState<
		ForgotPasswordResult | null,
		FormData
	>(forgotPasswordAction, null);

	const error = state && "error" in state ? state.error : null;
	const sent = state && "ok" in state;

	if (sent) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm">
					If an account exists for that email, we sent a password reset link.
					Check your inbox.
				</p>
				<p className="text-muted-foreground text-sm">
					Don't see it? Ask your admin to reset your password instead.
				</p>
				<Link href="/login" className="text-primary text-sm hover:underline">
					Back to sign in
				</Link>
			</div>
		);
	}

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="fp-email" className="font-medium text-sm">
					Email
				</label>
				<Input
					id="fp-email"
					name="email"
					type="email"
					autoComplete="email"
					defaultValue={initialEmail}
					required
				/>
			</div>
			{error && <p className="text-destructive text-sm">{error}</p>}
			<Button type="submit" disabled={pending}>
				{pending ? "Sending..." : "Send Reset Link"}
			</Button>
			<Link href="/login" className="text-primary text-sm hover:underline">
				Back to sign in
			</Link>
		</form>
	);
}
