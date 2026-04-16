"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 6;

type Props = {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	hasError?: boolean;
	autoFocus?: boolean;
};

export function PinInput({
	value,
	onChange,
	disabled,
	hasError,
	autoFocus,
}: Props) {
	const refs = useRef<(HTMLInputElement | null)[]>([]);

	useEffect(() => {
		if (autoFocus) refs.current[0]?.focus();
	}, [autoFocus]);

	// Focus first empty slot whenever value shrinks
	useEffect(() => {
		if (value.length < PIN_LENGTH) {
			refs.current[value.length]?.focus();
		}
	}, [value]);

	function handleKeyDown(
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) {
		if (e.key === "Backspace") {
			e.preventDefault();
			if (value.length > 0) {
				onChange(value.slice(0, -1));
			}
			return;
		}

		if (e.key === "ArrowLeft") {
			refs.current[Math.max(0, index - 1)]?.focus();
			return;
		}

		if (e.key === "ArrowRight") {
			refs.current[Math.min(PIN_LENGTH - 1, index + 1)]?.focus();
			return;
		}
	}

	function handleInput(index: number, e: React.FormEvent<HTMLInputElement>) {
		const raw = (e.currentTarget.value ?? "").replace(/\D/g, "");
		if (!raw) return;

		// Accept up to remaining digits
		const remaining = PIN_LENGTH - value.length;
		const added = raw.slice(0, remaining);
		const next = value + added;
		onChange(next);

		// Move focus
		const nextIndex = Math.min(next.length, PIN_LENGTH - 1);
		refs.current[nextIndex]?.focus();
	}

	function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
		if (!pasted) return;
		onChange(pasted.slice(0, PIN_LENGTH));
	}

	return (
		<div className="flex gap-3 justify-center">
			{Array.from({ length: PIN_LENGTH }).map((_, i) => (
				<input
					key={i}
					ref={(el) => {
						refs.current[i] = el;
					}}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={value[i] ? "•" : ""}
					readOnly
					disabled={disabled}
					onKeyDown={(e) => handleKeyDown(i, e)}
					onInput={(e) => handleInput(i, e)}
					onPaste={handlePaste}
					onClick={() => {
						// Always focus the next empty slot
						const target = Math.min(value.length, PIN_LENGTH - 1);
						refs.current[target]?.focus();
					}}
					className={cn(
						"w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 bg-white outline-none transition-colors",
						"focus:border-primary",
						hasError
							? "border-destructive"
							: value[i]
								? "border-primary"
								: "border-border",
						disabled && "opacity-50 cursor-not-allowed",
					)}
				/>
			))}
		</div>
	);
}
