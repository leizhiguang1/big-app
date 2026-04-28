import { Input } from "@/components/ui/input";
import {
	PAYMENT_BANKS,
	PAYMENT_CARD_TYPES,
	PAYMENT_EPS_MONTHS,
} from "@/lib/constants/payment-fields";
import type { PaymentMethod } from "@/lib/services/payment-methods";
import type { PaymentEntry } from "./types";

const selectBase =
	"h-7 w-full rounded-md border bg-background px-2 text-[11px] outline-none focus-visible:border-ring";
const inputClass = "h-7 text-[11px]";
const labelClass = "text-[10px] font-medium uppercase text-muted-foreground";

// Red asterisk next to the label for required fields. Deliberately quiet —
// no red borders, no "Required" pill, no aria-invalid. hasMissingRequiredFields
// (below) is what the submit button consults; don't shout at the cashier
// on every keystroke. Aoikumo's clamp-on-every-keystroke pattern is the
// anti-example we're avoiding.
function RequiredMark() {
	return <span className="ml-0.5 text-red-500">*</span>;
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
		fields.push(
			<div key="bank" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Bank
					<RequiredMark />
				</span>
				<select
					className={selectBase}
					value={entry.bank}
					onChange={(e) => onChange({ bank: e.target.value })}
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
		fields.push(
			<div key="card_type" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Card type
					<RequiredMark />
				</span>
				<select
					className={selectBase}
					value={entry.card_type}
					onChange={(e) => onChange({ card_type: e.target.value })}
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
		fields.push(
			<div key="months" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Months
					<RequiredMark />
				</span>
				<select
					className={selectBase}
					value={entry.months}
					onChange={(e) => onChange({ months: e.target.value })}
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
		fields.push(
			<div key="trace_no" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Trace no
					<RequiredMark />
				</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.trace_no}
					onChange={(e) => onChange({ trace_no: e.target.value })}
					maxLength={32}
					inputMode="numeric"
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_approval_code) {
		fields.push(
			<div key="approval_code" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Approval code
					<RequiredMark />
				</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.approval_code}
					onChange={(e) => onChange({ approval_code: e.target.value })}
					maxLength={32}
					inputMode="numeric"
					className={inputClass}
				/>
			</div>,
		);
	}
	if (method.requires_reference_no) {
		fields.push(
			<div key="reference_no" className="flex flex-col gap-0.5">
				<span className={labelClass}>
					Reference no
					<RequiredMark />
				</span>
				<Input
					placeholder="Eg. 888888"
					value={entry.reference_no}
					onChange={(e) => onChange({ reference_no: e.target.value })}
					maxLength={32}
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
