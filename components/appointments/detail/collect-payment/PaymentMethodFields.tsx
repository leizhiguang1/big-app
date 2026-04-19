import { Input } from "@/components/ui/input";
import {
	PAYMENT_BANKS,
	PAYMENT_CARD_TYPES,
	PAYMENT_EPS_MONTHS,
} from "@/lib/constants/payment-fields";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import { cn } from "@/lib/utils";
import type { PaymentEntry } from "./types";

const selectBase =
	"h-7 w-full rounded-md border bg-background px-2 text-[11px] outline-none focus-visible:border-ring";
const inputClass = "h-7 text-[11px]";
const labelClass = "text-[10px] font-medium uppercase text-muted-foreground";

function RequiredChip({ show }: { show: boolean }) {
	if (!show) return null;
	return (
		<span className="ml-1 rounded bg-red-100 px-1 py-0 text-[9px] font-semibold text-red-700">
			Required
		</span>
	);
}

export function hasMissingRequiredFields(
	method: PaymentMethod,
	entry: PaymentEntry,
): boolean {
	if (method.requires_bank && !entry.bank.trim()) return true;
	if (method.requires_card_type && !entry.card_type.trim()) return true;
	if (method.requires_months && !entry.months.trim()) return true;
	if (method.requires_trace_no && !entry.trace_no.trim()) return true;
	if (method.requires_approval_code && !entry.approval_code.trim()) return true;
	if (method.requires_reference_no && !entry.reference_no.trim()) return true;
	return false;
}

export function PaymentMethodFields({
	method,
	entry,
	onChange,
}: {
	method: PaymentMethod;
	entry: PaymentEntry;
	onChange: (patch: Partial<PaymentEntry>) => void;
}) {
	const fields: React.ReactNode[] = [];
	if (method.requires_bank) {
		const missing = !entry.bank.trim();
		fields.push(
			<div key="bank" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Bank
					<RequiredChip show={missing} />
				</span>
				<select
					className={cn(
						selectBase,
						missing ? "border-red-400" : "border-input",
					)}
					value={entry.bank}
					onChange={(e) => onChange({ bank: e.target.value })}
					aria-invalid={missing || undefined}
				>
					<option value="">Please choose…</option>
					{PAYMENT_BANKS.map((b) => (
						<option key={b} value={b}>
							{b}
						</option>
					))}
				</select>
			</div>,
		);
	}
	if (method.requires_card_type) {
		const missing = !entry.card_type.trim();
		fields.push(
			<div key="card_type" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Card type
					<RequiredChip show={missing} />
				</span>
				<select
					className={cn(
						selectBase,
						missing ? "border-red-400" : "border-input",
					)}
					value={entry.card_type}
					onChange={(e) => onChange({ card_type: e.target.value })}
					aria-invalid={missing || undefined}
				>
					<option value="">Please choose…</option>
					{PAYMENT_CARD_TYPES.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
			</div>,
		);
	}
	if (method.requires_months) {
		const missing = !entry.months.trim();
		fields.push(
			<div key="months" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Months
					<RequiredChip show={missing} />
				</span>
				<select
					className={cn(
						selectBase,
						missing ? "border-red-400" : "border-input",
					)}
					value={entry.months}
					onChange={(e) => onChange({ months: e.target.value })}
					aria-invalid={missing || undefined}
				>
					<option value="">Please choose…</option>
					{PAYMENT_EPS_MONTHS.map((m) => (
						<option key={m} value={String(m)}>
							{m}
						</option>
					))}
				</select>
			</div>,
		);
	}
	if (method.requires_trace_no) {
		const missing = !entry.trace_no.trim();
		fields.push(
			<div key="trace_no" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Trace no
					<RequiredChip show={missing} />
				</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.trace_no}
					onChange={(e) => onChange({ trace_no: e.target.value })}
					maxLength={32}
					inputMode="numeric"
					aria-invalid={missing || undefined}
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_approval_code) {
		const missing = !entry.approval_code.trim();
		fields.push(
			<div key="approval_code" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Approval code
					<RequiredChip show={missing} />
				</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.approval_code}
					onChange={(e) => onChange({ approval_code: e.target.value })}
					maxLength={32}
					inputMode="numeric"
					aria-invalid={missing || undefined}
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_reference_no) {
		const missing = !entry.reference_no.trim();
		fields.push(
			<div key="reference_no" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Reference no
					<RequiredChip show={missing} />
				</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.reference_no}
					onChange={(e) => onChange({ reference_no: e.target.value })}
					maxLength={32}
					aria-invalid={missing || undefined}
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_remarks) {
		fields.push(
			<div key="remarks" className="col-span-2 flex flex-col gap-0.5">
				<span className={labelClass}>Remarks</span>
				<Input
					placeholder="Add Remarks"
					value={entry.remarks}
					onChange={(e) => onChange({ remarks: e.target.value })}
					maxLength={500}
					className={inputClass}
				/>
			</div>,
		);
	}

	if (fields.length === 0) return null;
	return <div className="grid grid-cols-2 gap-2">{fields}</div>;
}
