import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoonCard({ sectionLabel }: { sectionLabel: string }) {
	return (
		<Card>
			<CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Construction className="size-6" />
				</div>
				<div className="font-heading font-medium text-base">{sectionLabel}</div>
				<p className="max-w-md text-muted-foreground text-sm">
					Coming soon. This section will let you configure{" "}
					{sectionLabel.toLowerCase()} for your business.
				</p>
			</CardContent>
		</Card>
	);
}
