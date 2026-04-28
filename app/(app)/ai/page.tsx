import { AIConfigClient } from "@/components/ai/AIConfigClient";

export const dynamic = "force-dynamic";

export default function AiPage() {
	return (
		<div className="flex flex-col gap-4">
			<AIConfigClient />
		</div>
	);
}
