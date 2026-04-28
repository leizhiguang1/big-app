export type AIModel = {
	id: string;
	label: string;
	badge: string;
	badgeClass: string;
	desc: string;
	apiBase: string;
	docsUrl: string;
};

export const AI_MODELS: AIModel[] = [
	{
		id: "deepseek/deepseek-chat",
		label: "DeepSeek V3",
		badge: "Cheapest",
		badgeClass: "bg-emerald-500/15 text-emerald-700",
		desc: "Best price/quality. ~$0.27 per 1M input tokens. Recommended.",
		apiBase: "https://api.deepseek.com/v1",
		docsUrl: "https://platform.deepseek.com",
	},
	{
		id: "deepseek/deepseek-reasoner",
		label: "DeepSeek R1",
		badge: "Reasoning",
		badgeClass: "bg-purple-500/15 text-purple-700",
		desc: "Deep reasoning. Better for complex queries. Slower.",
		apiBase: "https://api.deepseek.com/v1",
		docsUrl: "https://platform.deepseek.com",
	},
	{
		id: "gpt-4o-mini",
		label: "GPT-4o mini",
		badge: "Reliable",
		badgeClass: "bg-sky-500/15 text-sky-700",
		desc: "Fast & reliable. OpenAI.",
		apiBase: "https://api.openai.com/v1",
		docsUrl: "https://platform.openai.com",
	},
	{
		id: "claude-haiku-4-5-20251001",
		label: "Claude Haiku 4.5",
		badge: "Best Quality",
		badgeClass: "bg-orange-500/15 text-orange-700",
		desc: "Best instruction-following. Anthropic API.",
		apiBase: "https://api.anthropic.com",
		docsUrl: "https://console.anthropic.com",
	},
];

export type AIPageConfig = {
	enabled: boolean;
	model: string;
	apiKey: string;
	apiBase: string;
	mode: "all" | "unassigned";
	handoffKeyword: string;
	maxHistory: number;
	bookingMode: "approval" | "auto";
	transcriptApiKey?: string;
	transcriptApiBase?: string;
	systemPromptPrefix?: string;
	allowedNumbers?: string;
};

export const DEFAULT_AI_CONFIG: AIPageConfig = {
	enabled: false,
	model: "deepseek/deepseek-chat",
	apiKey: "",
	apiBase: "https://api.deepseek.com/v1",
	mode: "all",
	handoffKeyword: "HUMAN",
	maxHistory: 10,
	bookingMode: "approval",
	transcriptApiKey: "",
	transcriptApiBase: "https://api.openai.com/v1",
};
