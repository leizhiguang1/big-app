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
	// Fade-out ratio (0–1) of duration spent ramping to zero. Smoother endings.
	fadeRatio?: number;
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
		const peak = t.gain ?? 0.16;
		const fadeStart = t.duration * (1 - (t.fadeRatio ?? 0.4));
		// Attack
		gain.gain.setValueAtTime(0, now + t.startOffset);
		gain.gain.linearRampToValueAtTime(peak, now + t.startOffset + 0.008);
		// Sustain
		gain.gain.setValueAtTime(peak, now + t.startOffset + fadeStart);
		// Release
		gain.gain.exponentialRampToValueAtTime(
			0.001,
			now + t.startOffset + t.duration,
		);
		osc.connect(gain).connect(audio.destination);
		osc.start(now + t.startOffset);
		osc.stop(now + t.startOffset + t.duration + 0.02);
	}
}

// --- Status-change sounds (realtime appointment updates) ---

// Soft tap with a gentle tail — subtle "reset" acknowledgment
const PENDING: Tone[] = [
	{ freq: 440, startOffset: 0, duration: 0.25, type: "sine", gain: 0.09, fadeRatio: 0.6 },
];

// Gentle rising note — "acknowledged"
const CONFIRMED: Tone[] = [
	{ freq: 587, startOffset: 0, duration: 0.1, type: "sine", gain: 0.1 },
	{ freq: 740, startOffset: 0.08, duration: 0.14, type: "sine", gain: 0.1, fadeRatio: 0.5 },
];

// Bold ding-dong-ding doorbell — unmistakable "someone's here"
const ARRIVED: Tone[] = [
	{ freq: 1047, startOffset: 0, duration: 0.22, type: "sine", gain: 0.2 },
	{ freq: 784, startOffset: 0.2, duration: 0.22, type: "sine", gain: 0.18 },
	{ freq: 1047, startOffset: 0.4, duration: 0.35, type: "sine", gain: 0.2, fadeRatio: 0.5 },
];

// Gentle ascending triplet — "let's begin"
const STARTED: Tone[] = [
	{ freq: 523.25, startOffset: 0, duration: 0.12, type: "triangle", gain: 0.14 },
	{ freq: 659.25, startOffset: 0.1, duration: 0.12, type: "triangle", gain: 0.14 },
	{ freq: 784, startOffset: 0.2, duration: 0.2, type: "triangle", gain: 0.15, fadeRatio: 0.5 },
];

// // Option A: "deng leng deng ding ding ding"
// const BILLING: Tone[] = [
// 	{ freq: 1319, startOffset: 0, duration: 0.18, type: "triangle", gain: 0.16, fadeRatio: 0.3 },
// 	{ freq: 1175, startOffset: 0.16, duration: 0.18, type: "triangle", gain: 0.15, fadeRatio: 0.3 },
// 	{ freq: 1319, startOffset: 0.32, duration: 0.18, type: "triangle", gain: 0.16, fadeRatio: 0.3 },
// 	{ freq: 1760, startOffset: 0.55, duration: 0.1, type: "sine", gain: 0.15, fadeRatio: 0.3 },
// 	{ freq: 1760, startOffset: 0.67, duration: 0.1, type: "sine", gain: 0.15, fadeRatio: 0.3 },
// 	{ freq: 2093, startOffset: 0.79, duration: 0.32, type: "sine", gain: 0.14, fadeRatio: 0.4 },
// ];

// Option B: "do re mi · so so so"
const BILLING: Tone[] = [
	// do (C5)
	{ freq: 1047, startOffset: 0, duration: 0.14, type: "triangle", gain: 0.16, fadeRatio: 0.3 },
	// re (D5)
	{ freq: 1175, startOffset: 0.12, duration: 0.14, type: "triangle", gain: 0.16, fadeRatio: 0.3 },
	// mi (E5)
	{ freq: 1319, startOffset: 0.24, duration: 0.16, type: "triangle", gain: 0.16, fadeRatio: 0.3 },
	// so (G5, quick)
	{ freq: 1568, startOffset: 0.44, duration: 0.1, type: "sine", gain: 0.15, fadeRatio: 0.3 },
	// so (G5, quick)
	{ freq: 1568, startOffset: 0.56, duration: 0.1, type: "sine", gain: 0.15, fadeRatio: 0.3 },
	// so (G5, ring out)
	{ freq: 1568, startOffset: 0.68, duration: 0.28, type: "sine", gain: 0.15, fadeRatio: 0.4 },
];

// Subdued low two-tone — "missed" feeling, not alarming
const NOSHOW: Tone[] = [
	{ freq: 330, startOffset: 0, duration: 0.22, type: "sine", gain: 0.1, fadeRatio: 0.5 },
	{ freq: 262, startOffset: 0.2, duration: 0.3, type: "sine", gain: 0.09, fadeRatio: 0.6 },
];

// Satisfying major chord arpeggio — "all done!"
const COMPLETED: Tone[] = [
	{ freq: 523.25, startOffset: 0, duration: 0.12, type: "sine", gain: 0.13 },
	{ freq: 659.25, startOffset: 0.1, duration: 0.12, type: "sine", gain: 0.14 },
	{ freq: 784, startOffset: 0.2, duration: 0.12, type: "sine", gain: 0.14 },
	{ freq: 1047, startOffset: 0.3, duration: 0.26, type: "sine", gain: 0.15, fadeRatio: 0.5 },
];

const STATUS_PATTERNS: Record<NonNullable<StatusSound>, Tone[]> = {
	pending: PENDING,
	confirmed: CONFIRMED,
	arrived: ARRIVED,
	started: STARTED,
	billing: BILLING,
	noshow: NOSHOW,
	completed: COMPLETED,
};

export function playStatusSound(sound: StatusSound) {
	if (!sound) return;
	const pattern = STATUS_PATTERNS[sound];
	if (pattern) playTones(pattern);
}
