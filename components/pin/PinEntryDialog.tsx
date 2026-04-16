"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { verifyPinAction } from "@/lib/actions/employees";
import { cn } from "@/lib/utils";
import { PinInput } from "./PinInput";

export type PinEmployee = {
	id: string;
	first_name: string;
	last_name: string;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Full list of selectable employees. */
	employees: PinEmployee[];
	/** Pre-selects this employee; defaults to first in list. */
	defaultEmployeeId?: string;
	/** Called with the verified employee id after correct PIN. */
	onSuccess: (employeeId: string) => void;
	title?: string;
};

export function PinEntryDialog({
	open,
	onOpenChange,
	employees,
	defaultEmployeeId,
	onSuccess,
	title = "SELECT YOUR NAME AND ENTER YOUR PIN",
}: Props) {
	const [selectedId, setSelectedId] = useState(
		defaultEmployeeId ?? employees[0]?.id ?? "",
	);
	const [pin, setPin] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	// Reset state when dialog opens / default employee changes
	useEffect(() => {
		if (open) {
			setSelectedId(defaultEmployeeId ?? employees[0]?.id ?? "");
			setPin("");
			setError(null);
		}
	}, [open, defaultEmployeeId, employees]);

	// Auto-verify when 6 digits are entered
	useEffect(() => {
		if (pin.length !== 6) return;

		startTransition(async () => {
			const ok = await verifyPinAction(selectedId, pin);
			if (ok) {
				onSuccess(selectedId);
				onOpenChange(false);
			} else {
				setError("Incorrect PIN. Please try again.");
				setPin("");
			}
		});
	}, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

	function handleEmployeeChange(e: React.ChangeEvent<HTMLSelectElement>) {
		setSelectedId(e.target.value);
		setPin("");
		setError(null);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="text-center text-sm font-semibold tracking-widest uppercase italic text-muted-foreground">
						{title}
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-6 py-2">
					{/* Employee selector */}
					<select
						value={selectedId}
						onChange={handleEmployeeChange}
						disabled={isPending}
						className={cn(
							"w-full rounded-md border border-border bg-background px-3 py-2",
							"text-sm font-medium text-foreground",
							"focus:outline-none focus:ring-2 focus:ring-ring",
							"disabled:opacity-50",
						)}
					>
						{employees.map((emp) => (
							<option key={emp.id} value={emp.id}>
								{emp.first_name.toUpperCase()} {emp.last_name.toUpperCase()}
							</option>
						))}
					</select>

					{/* PIN boxes */}
					<div className="flex flex-col items-center gap-3">
						<PinInput
							value={pin}
							onChange={(v) => {
								setPin(v);
								if (error) setError(null);
							}}
							disabled={isPending}
							hasError={!!error}
							autoFocus={open}
						/>

						{/* Status area — fixed height so layout doesn't jump */}
						<div className="h-5 flex items-center justify-center">
							{isPending && (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							)}
							{error && !isPending && (
								<p className="flex items-center gap-1.5 text-xs text-destructive">
									<AlertCircle className="h-3.5 w-3.5" />
									{error}
								</p>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
