import { useMemo, useState } from "react";

export function useRounding(rawTotal: number) {
	const [requireRounding, setRequireRounding] = useState(false);
	const [roundedTotalInput, setRoundedTotalInput] = useState("");

	const rounding = useMemo(() => {
		if (!requireRounding) return 0;
		const parsed = Number(roundedTotalInput);
		if (!Number.isFinite(parsed)) return 0;
		return Math.round((parsed - rawTotal) * 100) / 100;
	}, [requireRounding, roundedTotalInput, rawTotal]);

	const roundingExceedsLimit = requireRounding && Math.abs(rounding) > 1;
	const total = Math.max(0, rawTotal + rounding);

	return {
		requireRounding,
		setRequireRounding,
		roundedTotalInput,
		setRoundedTotalInput,
		rounding,
		roundingExceedsLimit,
		total,
	};
}
