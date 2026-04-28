export function ConfigSectionHeader({
	categoryTitle,
	sectionLabel,
	description,
}: {
	categoryTitle: string;
	sectionLabel: string;
	description?: string;
}) {
	return (
		<div className="mb-6 flex flex-col gap-1 border-border border-b pb-4">
			<div className="text-muted-foreground text-xs uppercase tracking-wide">
				{categoryTitle}
			</div>
			<h1 className="font-semibold text-2xl tracking-tight">{sectionLabel}</h1>
			{description ? (
				<p className="text-muted-foreground text-sm">{description}</p>
			) : null}
		</div>
	);
}
