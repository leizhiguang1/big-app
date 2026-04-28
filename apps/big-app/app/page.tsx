import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
	const h = await headers();
	const brandId = h.get("x-brand-id");
	redirect(brandId ? "/dashboard" : "/select-brand");
}
