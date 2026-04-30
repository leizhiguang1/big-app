import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerContext } from "@/lib/context/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const ctx = await getServerContext();
	if (!ctx.brandId) redirect("/select-brand");
	if (!ctx.currentUser) redirect("/login");
	if (!ctx.currentUser.employeeId) redirect("/select-brand?no_access=1");
	return <>{children}</>;
}
