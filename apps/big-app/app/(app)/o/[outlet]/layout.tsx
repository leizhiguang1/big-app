import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppointmentNotificationsProvider } from "@/components/notifications/AppointmentNotificationsProvider";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import type { OutletNavItem } from "@/components/shell/outlet-selector";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";
import { mediaPublicUrl } from "@/lib/storage/urls";
import { outletPath } from "@/lib/outlet-path";

export default async function OutletScopedLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ outlet: string }>;
}) {
	const { outlet: outletCode } = await params;
	const ctx = await getServerContext();
	if (!ctx.brandId || !ctx.currentUser?.employeeId) redirect("/select-brand");

	const outlets = await listOutlets(ctx);
	const activeOutlets = outlets.filter((o) => o.is_active);
	if (activeOutlets.length === 0) {
		return (
			<div className="flex min-h-svh items-center justify-center p-6 text-center text-muted-foreground text-sm">
				No active outlets in this brand. Create one in Settings → Outlets first.
			</div>
		);
	}

	const current = activeOutlets.find((o) => o.code === outletCode);
	if (!current) {
		const fallback = activeOutlets[0];
		redirect(outletPath(fallback.code, "/dashboard"));
	}

	const navOutlets: OutletNavItem[] = activeOutlets.map((o) => ({
		id: o.id,
		code: o.code,
		name: o.name,
		nick_name: o.nick_name,
	}));

	const { data: emp } = await ctx.dbAdmin
		.from("employees")
		.select(
			"first_name, last_name, profile_image_path, pin_hash, role:roles(name)",
		)
		.eq("id", ctx.currentUser.employeeId)
		.eq("brand_id", ctx.brandId)
		.maybeSingle();
	const fullName = emp
		? [emp.first_name, emp.last_name].filter(Boolean).join(" ")
		: null;
	const role = (emp as { role?: { name?: string | null } | null } | null)?.role;
	const roleName = role?.name ?? null;
	const hasPin = Boolean(emp?.pin_hash);
	const imagePath = emp?.profile_image_path ?? null;

	return (
		<AppointmentNotificationsProvider outletId={current.id}>
			<SidebarProvider className="h-svh">
				<AppSidebar outletCode={current.code} />
				<SidebarInset className="min-w-0">
					<AppTopbar
						outlets={navOutlets}
						activeOutletCode={current.code}
						email={ctx.currentUser.email ?? null}
						name={fullName}
						role={roleName}
						imageUrl={mediaPublicUrl(imagePath)}
						hasPin={hasPin}
					/>
					<main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
						{children}
					</main>
				</SidebarInset>
			</SidebarProvider>
		</AppointmentNotificationsProvider>
	);
}
