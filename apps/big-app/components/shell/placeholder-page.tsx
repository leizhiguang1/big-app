import { Construction } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type PlaceholderPageProps = {
	title: string;
	description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
				{description && (
					<p className="mt-1 text-muted-foreground text-sm">{description}</p>
				)}
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Construction className="size-5 text-muted-foreground" />
						<CardTitle className="text-base">Coming soon</CardTitle>
					</div>
					<CardDescription>
						This module isn't built yet. We're starting with the shell — real
						screens land as each module is implemented.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					See <code>docs/modules/</code> for the plan and field-level spec.
				</CardContent>
			</Card>
		</div>
	);
}
