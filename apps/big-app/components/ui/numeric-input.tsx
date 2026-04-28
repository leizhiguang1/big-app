"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

export function parseMoney(
	raw: string | number | null | undefined,
	fallback = 0,
): number {
	if (raw == null) return fallback;
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : fallback;
	const s = raw.trim();
	if (s === "") return fallback;
	const n = Number(s);
	return Number.isFinite(n) ? n : fallback;
}

type BaseProps = Omit<
	React.ComponentProps<typeof Input>,
	"value" | "onChange" | "type"
> & {
	min?: number;
	max?: number;
	decimals?: number;
	allowEmpty?: boolean;
};

export type NumericInputProps = BaseProps & {
	value: number;
	onChange: (n: number) => void;
	onBlurCommit?: (n: number) => void;
};

export function NumericInput({
	value,
	onChange,
	onBlurCommit,
	min,
	max,
	decimals = 2,
	allowEmpty = false,
	inputMode = "decimal",
	onFocus,
	onBlur,
	...rest
}: NumericInputProps) {
	const fmt = React.useCallback(
		(n: number) => (Number.isFinite(n) ? n.toFixed(decimals) : ""),
		[decimals],
	);
	const [raw, setRaw] = React.useState(() => fmt(value));
	const focusedRef = React.useRef(false);

	React.useEffect(() => {
		if (focusedRef.current) return;
		const next = fmt(value);
		setRaw((prev) => (prev === next ? prev : next));
	}, [value, fmt]);

	const parsed = Number(raw);
	const isEmpty = raw.trim() === "";
	const outOfRange =
		!isEmpty &&
		Number.isFinite(parsed) &&
		((min != null && parsed < min) || (max != null && parsed > max));
	const invalid = (!isEmpty && !Number.isFinite(parsed)) || outOfRange;

	return (
		<Input
			{...rest}
			type="text"
			inputMode={inputMode}
			autoComplete="off"
			value={raw}
			aria-invalid={invalid || undefined}
			onFocus={(e) => {
				focusedRef.current = true;
				onFocus?.(e);
			}}
			onChange={(e) => {
				const v = e.target.value;
				setRaw(v);
				if (v.trim() === "") return;
				const n = Number(v);
				if (Number.isFinite(n)) onChange(n);
			}}
			onBlur={(e) => {
				focusedRef.current = false;
				onBlur?.(e);
				if (isEmpty) {
					if (allowEmpty) {
						onChange(0);
						onBlurCommit?.(0);
						return;
					}
					const fb = min ?? 0;
					onChange(fb);
					setRaw(fmt(fb));
					onBlurCommit?.(fb);
					return;
				}
				let n = Number.isFinite(parsed) ? parsed : (min ?? 0);
				if (min != null && n < min) n = min;
				if (max != null && n > max) n = max;
				onChange(n);
				setRaw(fmt(n));
				onBlurCommit?.(n);
			}}
		/>
	);
}

export type MoneyInputProps = Omit<NumericInputProps, "decimals"> & {
	decimals?: number;
};
export function MoneyInput(props: MoneyInputProps) {
	return <NumericInput decimals={2} {...props} />;
}

export type QtyInputProps = Omit<NumericInputProps, "decimals" | "min"> & {
	min?: number;
	integer?: boolean;
};
export function QtyInput({ integer = true, min = 1, ...rest }: QtyInputProps) {
	return (
		<NumericInput
			decimals={integer ? 0 : 2}
			min={min}
			inputMode={integer ? "numeric" : "decimal"}
			{...rest}
		/>
	);
}

export type PercentInputProps = Omit<
	NumericInputProps,
	"decimals" | "min" | "max"
> & {
	decimals?: number;
};
export function PercentInput({ decimals = 2, ...rest }: PercentInputProps) {
	return <NumericInput decimals={decimals} min={0} max={100} {...rest} />;
}

export type RawNumericInputProps = Omit<
	React.ComponentProps<typeof Input>,
	"value" | "onChange" | "type"
> & {
	value: string;
	onChange: (raw: string) => void;
	onCommit?: (n: number) => void;
	min?: number;
	max?: number;
	decimals?: number;
	allowEmpty?: boolean;
};

export function RawNumericInput({
	value,
	onChange,
	onCommit,
	min,
	max,
	decimals = 2,
	allowEmpty = true,
	inputMode = "decimal",
	onBlur,
	...rest
}: RawNumericInputProps) {
	const parsed = Number(value);
	const isEmpty = value.trim() === "";
	const outOfRange =
		!isEmpty &&
		Number.isFinite(parsed) &&
		((min != null && parsed < min) || (max != null && parsed > max));
	const invalid = (!isEmpty && !Number.isFinite(parsed)) || outOfRange;

	return (
		<Input
			{...rest}
			type="text"
			inputMode={inputMode}
			autoComplete="off"
			value={value}
			aria-invalid={invalid || undefined}
			onChange={(e) => onChange(e.target.value)}
			onBlur={(e) => {
				onBlur?.(e);
				if (isEmpty) {
					if (allowEmpty) {
						onCommit?.(0);
						return;
					}
					const fb = min ?? 0;
					onChange(fb.toFixed(decimals));
					onCommit?.(fb);
					return;
				}
				let n = Number.isFinite(parsed) ? parsed : (min ?? 0);
				if (min != null && n < min) n = min;
				if (max != null && n > max) n = max;
				onChange(n.toFixed(decimals));
				onCommit?.(n);
			}}
		/>
	);
}
