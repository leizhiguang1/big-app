"use client";

import { KeyRound, Lock, Mail, Pencil } from "lucide-react";
import { type ComponentProps, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	changeOwnEmailAction,
	changeOwnPasswordAction,
	changeOwnPinAction,
} from "@/lib/actions/employees";

type Section = "email" | "password" | "pin" | null;

/** Text input that looks like a password field but doesn't trigger autofill. */
function MaskedInput(props: ComponentProps<typeof Input>) {
	return (
		<Input
			{...props}
			type="text"
			autoComplete="off"
			autoCorrect="off"
			autoCapitalize="off"
			spellCheck={false}
			style={{ WebkitTextSecurity: "disc", ...props.style }}
		/>
	);
}

export function ChangeCredentialsDialog({
	open,
	currentEmail,
	hasPin,
	onClose,
}: {
	open: boolean;
	currentEmail: string;
	hasPin: boolean;
	onClose: () => void;
}) {
	const [editing, setEditing] = useState<Section>(null);
	const [success, setSuccess] = useState<Section>(null);

	// Email
	const [newEmail, setNewEmail] = useState("");
	const [emailError, setEmailError] = useState<string | null>(null);

	// Password
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [pwError, setPwError] = useState<string | null>(null);

	// PIN
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);

	const [pending, startTransition] = useTransition();

	const reset = () => {
		setEditing(null);
		setSuccess(null);
		setNewEmail("");
		setEmailError(null);
		setNewPassword("");
		setConfirmPassword("");
		setPwError(null);
		setNewPin("");
		setConfirmPin("");
		setPinError(null);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const cancelEdit = () => {
		setEditing(null);
		setNewEmail("");
		setEmailError(null);
		setNewPassword("");
		setConfirmPassword("");
		setPwError(null);
		setNewPin("");
		setConfirmPin("");
		setPinError(null);
	};

	const handleEmailSubmit = () => {
		setEmailError(null);
		startTransition(async () => {
			const result = await changeOwnEmailAction(newEmail);
			if ("error" in result) {
				setEmailError(result.error);
			} else {
				setSuccess("email");
				setEditing(null);
				setNewEmail("");
				// Sign out after a short delay so user sees the confirmation
				setTimeout(() => {
					const form = document.createElement("form");
					form.method = "POST";
					form.action = "/logout";
					document.body.appendChild(form);
					form.submit();
				}, 1500);
			}
		});
	};

	const handlePasswordSubmit = () => {
		setPwError(null);
		startTransition(async () => {
			const result = await changeOwnPasswordAction(newPassword);
			if ("error" in result) {
				setPwError(result.error);
			} else {
				setSuccess("password");
				setEditing(null);
				setNewPassword("");
				setConfirmPassword("");
			}
		});
	};

	const handlePinSubmit = () => {
		setPinError(null);
		startTransition(async () => {
			const result = await changeOwnPinAction(newPin);
			if ("error" in result) {
				setPinError(result.error);
			} else {
				setSuccess("pin");
				setEditing(null);
				setNewPin("");
				setConfirmPin("");
			}
		});
	};

	const emailValid =
		newEmail.length > 0 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) &&
		newEmail !== currentEmail;

	const passwordValid =
		newPassword.length >= 8 &&
		newPassword === confirmPassword &&
		confirmPassword.length > 0;

	const pinValid = /^\d{6}$/.test(newPin) && newPin === confirmPin;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="gap-0 p-0 sm:max-w-sm">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle>Account Settings</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col divide-y">
					{/* Email row */}
					<div className="px-5 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-md bg-muted">
									<Mail className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0">
									<p className="font-medium text-sm">Email</p>
									<p className="truncate text-muted-foreground text-xs">
										{success === "email" ? (
											<span className="text-emerald-600">Email changed. Signing out...</span>
										) : (
											currentEmail
										)}
									</p>
								</div>
							</div>
							{editing !== "email" && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => { cancelEdit(); setEditing("email"); setSuccess(null); }}
								>
									<Pencil className="mr-1 size-3" />
									Change
								</Button>
							)}
						</div>
						{editing === "email" && (
							<form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (emailValid && !pending) handleEmailSubmit(); }}>
								<Input
									type="text"
									name="nofill_em"
									placeholder="New email address"
									autoComplete="off"
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
								/>
								{emailError && <p className="text-destructive text-xs">{emailError}</p>}
								<p className="text-muted-foreground text-xs">
									This changes your login email. You will be signed out after saving.
								</p>
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										className="h-7"
										disabled={!emailValid || pending}
									>
										{pending ? "Saving..." : "Save"}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7"
										onClick={cancelEdit}
									>
										Cancel
									</Button>
								</div>
							</form>
						)}
					</div>

					{/* Password row */}
					<div className="px-5 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-md bg-muted">
									<Lock className="size-4 text-muted-foreground" />
								</div>
								<div>
									<p className="font-medium text-sm">Password</p>
									<p className="text-muted-foreground text-xs">
										{success === "password" ? (
											<span className="text-emerald-600">Updated successfully</span>
										) : (
											"••••••••"
										)}
									</p>
								</div>
							</div>
							{editing !== "password" && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => { cancelEdit(); setEditing("password"); setSuccess(null); }}
								>
									<Pencil className="mr-1 size-3" />
									Change
								</Button>
							)}
						</div>
						{editing === "password" && (
							<form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (passwordValid && !pending) handlePasswordSubmit(); }}>
								<MaskedInput
									name="nofill_pw"
									placeholder="New password (min 8 chars)"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
								/>
								<MaskedInput
									name="nofill_pw2"
									placeholder="Confirm new password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
								/>
								{confirmPassword.length > 0 && newPassword !== confirmPassword && (
									<p className="text-destructive text-xs">Passwords do not match</p>
								)}
								{newPassword.length > 0 && newPassword.length < 8 && (
									<p className="text-muted-foreground text-xs">At least 8 characters</p>
								)}
								{pwError && <p className="text-destructive text-xs">{pwError}</p>}
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										className="h-7"
										disabled={!passwordValid || pending}
									>
										{pending ? "Saving..." : "Save"}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7"
										onClick={cancelEdit}
									>
										Cancel
									</Button>
								</div>
							</form>
						)}
					</div>

					{/* PIN row */}
					<div className="px-5 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-md bg-muted">
									<KeyRound className="size-4 text-muted-foreground" />
								</div>
								<div>
									<p className="font-medium text-sm">PIN</p>
									<p className="text-muted-foreground text-xs">
										{success === "pin" ? (
											<span className="text-emerald-600">Updated successfully</span>
										) : hasPin ? (
											"••••••"
										) : (
											"Not set"
										)}
									</p>
								</div>
							</div>
							{editing !== "pin" && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => { cancelEdit(); setEditing("pin"); setSuccess(null); }}
								>
									<Pencil className="mr-1 size-3" />
									{hasPin ? "Change" : "Set"}
								</Button>
							)}
						</div>
						{editing === "pin" && (
							<form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (pinValid && !pending) handlePinSubmit(); }}>
								<MaskedInput
									name="nofill_pin"
									inputMode="numeric"
									maxLength={6}
									placeholder="New 6-digit PIN"
									value={newPin}
									onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
								/>
								<MaskedInput
									name="nofill_pin2"
									inputMode="numeric"
									maxLength={6}
									placeholder="Confirm PIN"
									value={confirmPin}
									onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
								/>
								{confirmPin.length > 0 && newPin !== confirmPin && (
									<p className="text-destructive text-xs">PINs do not match</p>
								)}
								{pinError && <p className="text-destructive text-xs">{pinError}</p>}
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										className="h-7"
										disabled={!pinValid || pending}
									>
										{pending ? "Saving..." : "Save"}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7"
										onClick={cancelEdit}
									>
										Cancel
									</Button>
								</div>
							</form>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
