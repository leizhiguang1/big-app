const TAG_COLORS = [
	"#e53935",
	"#d81b60",
	"#8e24aa",
	"#5e35b1",
	"#1e88e5",
	"#00897b",
	"#43a047",
	"#f4511e",
	"#fb8c00",
	"#6d4c41",
	"#546e7a",
	"#039be5",
];

export function tagColor(tag: string): string {
	let hash = 0;
	for (let i = 0; i < tag.length; i++) {
		hash = tag.charCodeAt(i) + ((hash << 5) - hash);
	}
	return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function tagChipStyle(tag: string): React.CSSProperties {
	const color = tagColor(tag);
	return {
		background: `${color}22`,
		color,
		borderColor: `${color}55`,
	};
}
