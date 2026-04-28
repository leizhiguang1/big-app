"use client";

import { useActionState } from "react";
import {
	type UpdatePasswordResult,
	updatePasswordAction,
} from "@/app/update-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
	const [state, formAction, pending] = useActionState<
		UpdatePasswordResult | null,
		FormData
	>(updatePasswordAction, null);

	const error = state && "error" in state ? state.error : null;

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="up-password" className="font-medium text-sm">
					New Password
				</label>
				<Input
					id="up-password"
					name="password"
					type="password"
					autoComplete="new-password"
					minLength={8}
					required
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor="up-confirm" className="font-medium text-sm">
					Confirm Password
				</label>
				<Input
					id="up-confirm"
					name="password_confirm"
					type="password"
					autoComplete="new-password"
					minLength={8}
					required
				/>
			</div>
			{error && <p className="text-destructive text-sm">{error}</p>}
			<Button type="submit" disabled={pending}>
				{pending ? "Updating..." : "Set Password"}
			</Button>
		</form>
	);
}
