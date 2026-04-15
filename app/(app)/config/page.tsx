import { redirect } from "next/navigation";
import { CATEGORIES } from "@/components/config/categories-data";

export default function ConfigPage() {
	const first = CATEGORIES[0];
	const firstSection = first.sections[0];
	redirect(`/config/${first.slug}?section=${firstSection.key}`);
}
