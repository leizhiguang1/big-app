export function formatDuration(ms: number): string {
	const neg = ms < 0;
	const s = Math.floor(Math.abs(ms) / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${neg ? "-" : ""}${pad(h)}H:${pad(m)}M:${pad(sec)}S`;
}

export function formatDurationSigned(ms: number): string {
	const sign = ms >= 0 ? "+" : "-";
	const abs = Math.abs(ms);
	const s = Math.floor(abs / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${sign} ${pad(h)}H:${pad(m)}M:${pad(sec)}S`;
}

export function formatDurationHM(ms: number): string {
	const s = Math.floor(Math.abs(ms) / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(h)}H:${pad(m)}M`;
}

export function formatAge(dobIso: string | null | undefined): string {
	if (!dobIso) return "—";
	const dob = new Date(dobIso);
	if (Number.isNaN(dob.getTime())) return "—";
	const now = new Date();
	let years = now.getFullYear() - dob.getFullYear();
	let months = now.getMonth() - dob.getMonth();
	if (now.getDate() < dob.getDate()) months -= 1;
	if (months < 0) {
		years -= 1;
		months += 12;
	}
	if (years < 0) return "—";
	return `${years}Y ${months}M`;
}

export function formatDobShort(dobIso: string | null | undefined): string {
	if (!dobIso) return "—";
	const d = new Date(dobIso);
	if (Number.isNaN(d.getTime())) return "—";
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatClockTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
