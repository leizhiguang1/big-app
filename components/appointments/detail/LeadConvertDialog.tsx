"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { convertLeadToCustomerAction } from "@/lib/actions/appointments";
import type { EmployeeWithRelations } from "@/lib/services/employees";
import type { OutletWithRoomCount } from "@/lib/services/outlets";

const SELECT_CLASS =
	"h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type Props = {
	open: boolean;
	onClose: () => void;
	appointmentId: string;
	defaultName: string;
	defaultPhone: string;
	defaultOutletId: string;
	defaultConsultantId: string | null;
	outlets: OutletWithRoomCount[];
	employees: EmployeeWithRelations[];
	onConverted?: (customerId: string) => void;
};

export function LeadConvertDialog({
	open,
	onClose,
	appointmentId,
	defaultName,
	defaultPhone,
	defaultOutletId,
	defaultConsultantId,
	outlets,
	employees,
	onConverted,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const parts = defaultName.trim().split(/\s+/);
	const [firstName, setFirstName] = useState(parts[0] ?? "");
	const [lastName, setLastName] = useState(parts.slice(1).join(" "));
	const [phone, setPhone] = useState(defaultPhone);
	const [outletIdState, setOutletIdState] = useState(defaultOutletId);
	const [consultantId, setConsultantId] = useState(
		defaultConsultantId ?? employees[0]?.id ?? "",
	);

	const submit = () => {
		setError(null);
		if (!firstName.trim()) return setError("First name is required");
		if (!phone.trim()) return setError("Phone is required");
		if (!outletIdState) return setError("Home outlet is required");
		if (!consultantId) return setError("Consultant is required");
		startTransition(async () => {
			try {
				const result = await convertLeadToCustomerAction(appointmentId, {
					first_name: firstName,
					last_name: lastName || undefined,
					phone,
					home_outlet_id: outletIdState,
					consultant_id: consultantId,
				});
				onConverted?.(result.customerId);
				onClose();
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to register customer",
				);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
				<DialogHeader className="border-b px-5 py-3">
					<DialogTitle className="text-base">Register as Customer</DialogTitle>
					<DialogDescription className="text-xs">
						Convert this walk-in lead into a permanent customer record.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 p-5">
					<div className="grid grid-cols-2 gap-3">
						<Field label="First name" required>
							<Input
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
						</Field>
						<Field label="Last name">
							<Input
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
							/>
						</Field>
					</div>
					<Field label="Phone" required>
						<Input
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
						/>
					</Field>
					<Field label="Home outlet" required>
						<select
							className={SELECT_CLASS}
							value={outletIdState}
							onChange={(e) => setOutletIdState(e.target.value)}
						>
							{outlets.map((o) => (
								<option key={o.id} value={o.id}>
									{o.name}
								</option>
							))}
						</select>
					</Field>
					<Field label="Consultant" required>
						<select
							className={SELECT_CLASS}
							value={consultantId}
							onChange={(e) => setConsultantId(e.target.value)}
						>
							<option value="">Please choose…</option>
							{employees.map((e) => (
								<option key={e.id} value={e.id}>
									{e.first_name} {e.last_name}
								</option>
							))}
						</select>
					</Field>
					<p className="rounded-md bg-muted/50 px-3 py-2 text-muted-foreground text-xs">
						All other lead bookings sharing this phone will be linked to the new
						customer automatically.
					</p>
					{error && <p className="text-destructive text-sm">{error}</p>}
				</div>

				<DialogFooter className="flex items-center justify-end gap-2 border-t bg-muted/20 px-4 py-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button type="button" size="sm" onClick={submit} disabled={pending}>
						{pending ? "Registering…" : "Register customer"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{label}
				{required && <span className="ml-0.5 text-destructive">*</span>}
			</span>
			{children}
		</div>
	);
}
