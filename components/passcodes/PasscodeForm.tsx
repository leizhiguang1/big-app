"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CreateButton } from "@/components/ui/create-button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { createPasscodeAction } from "@/lib/actions/passcodes";
import {
	PASSCODE_FUNCTION_LABELS,
	PASSCODE_FUNCTIONS,
	type PasscodeInput,
	passcodeInputSchema,
} from "@/lib/schemas/passcodes";

const SELECT_CLASS =
	"h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type OutletOption = { id: string; name: string };

type Props = {
	open: boolean;
	outlets: OutletOption[];
	onClose: () => void;
};

export function NewPasscodeDialog({ open, outlets, onClose }: Props) {
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<PasscodeInput>({
		resolver: zodResolver(passcodeInputSchema),
		defaultValues: {
			outlet_id: "",
			function: "VOID_SALES_ORDER_INVOICE",
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			outlet_id: outlets.length === 1 ? outlets[0].id : "",
			function: "VOID_SALES_ORDER_INVOICE",
		});
		setServerError(null);
	}, [open, outlets, form]);

	const onSubmit = form.handleSubmit((values) => {
		startTransition(async () => {
			try {
				await createPasscodeAction(values);
				onClose();
			} catch (err) {
				setServerError(
					err instanceof Error ? err.message : "Something went wrong",
				);
			}
		});
	});

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Generate passcode</DialogTitle>
					<DialogDescription>
						A 4-digit passcode will be generated for the chosen outlet and
						function. It can be used once and stays valid for 30 days.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="pc-outlet" className="text-sm font-medium">
								Outlet
							</label>
							<select
								id="pc-outlet"
								className={SELECT_CLASS}
								{...form.register("outlet_id")}
							>
								<option value="">— Select —</option>
								{outlets.map((o) => (
									<option key={o.id} value={o.id}>
										{o.name}
									</option>
								))}
							</select>
							{form.formState.errors.outlet_id && (
								<p className="text-destructive text-xs">
									{form.formState.errors.outlet_id.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="pc-function" className="text-sm font-medium">
								Function
							</label>
							<select
								id="pc-function"
								className={SELECT_CLASS}
								{...form.register("function")}
							>
								{PASSCODE_FUNCTIONS.map((fn) => (
									<option key={fn} value={fn}>
										{PASSCODE_FUNCTION_LABELS[fn]}
									</option>
								))}
							</select>
						</div>
						{serverError && (
							<p className="text-destructive text-sm">{serverError}</p>
						)}
					</div>
					<DialogFooter className="border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "Generating…" : "Generate"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function NewPasscodeButton({ outlets }: { outlets: OutletOption[] }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<CreateButton onClick={() => setOpen(true)}>
				Generate passcode
			</CreateButton>
			<NewPasscodeDialog
				open={open}
				outlets={outlets}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
