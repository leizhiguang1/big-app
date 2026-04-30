import { redirect } from "next/navigation";
import { CATEGORIES } from "@/components/config/categories-data";
import { outletPath } from "@/lib/outlet-path";

export default async function ConfigPage({
	params,
}: {
	params: Promise<{ outlet: string }>;
}) {
	const { outlet } = await params;
	const first = CATEGORIES[0];
	const firstSection = first.sections[0];
	redirect(
		outletPath(outlet, `/config/${first.slug}?section=${firstSection.key}`),
	);
}
