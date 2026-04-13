import type { StatusSound } from "@/lib/constants/appointment-notifications";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
	if (typeof window === "undefined") return null;
	if (ctx) return ctx;
	const Ctor =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!Ctor) return null;
	ctx = new Ctor();
	return ctx;
}

type Tone = {
	freq: number;
	startOffset: number;
	duration: number;
	type?: OscillatorType;
	gain?: number;
};

function playTones(tones: Tone[]) {
	const audio = getCtx();
	if (!audio) return;
	if (audio.state === "suspended") audio.resume().catch(() => {});
	const now = audio.currentTime;
	for (const t of tones) {
		const osc = audio.createOscillator();
		const gain = audio.createGain();
		osc.type = t.type ?? "sine";
		osc.frequency.value = t.freq;
		const peak = t.gain ?? 0.18;
		gain.gain.setValueAtTime(0, now + t.startOffset);
		gain.gain.linearRampToValueAtTime(peak, now + t.startOffset + 0.01);
		gain.gain.linearRampToValueAtTime(0, now + t.startOffset + t.duration);
		osc.connect(gain).connect(audio.destination);
		osc.start(now + t.startOffset);
		osc.stop(now + t.startOffset + t.duration + 0.02);
	}
}

const PATTERNS: Record<NonNullable<StatusSound>, Tone[]> = {
	arrived: [
		{ freq: 880, startOffset: 0, duration: 0.16 },
		{ freq: 1174.7, startOffset: 0.16, duration: 0.22 },
	],
	started: [
		{ freq: 659.3, startOffset: 0, duration: 0.1, type: "triangle" },
		{ freq: 783.99, startOffset: 0.12, duration: 0.1, type: "triangle" },
		{ freq: 1046.5, startOffset: 0.24, duration: 0.16, type: "triangle" },
	],
	billing: [
		{ freq: 1318.5, startOffset: 0, duration: 0.14 },
		{ freq: 987.77, startOffset: 0.16, duration: 0.2 },
	],
	noshow: [
		{ freq: 311.1, startOffset: 0, duration: 0.18, type: "sawtooth", gain: 0.12 },
		{ freq: 207.65, startOffset: 0.2, duration: 0.26, type: "sawtooth", gain: 0.12 },
	],
	completed: [
		{ freq: 523.25, startOffset: 0, duration: 0.1 },
		{ freq: 659.25, startOffset: 0.1, duration: 0.1 },
		{ freq: 783.99, startOffset: 0.2, duration: 0.18 },
	],
};

export function playStatusSound(sound: StatusSound) {
	if (!sound) return;
	const pattern = PATTERNS[sound];
	if (pattern) playTones(pattern);
}
