import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppointmentNotificationsProvider } from "@/components/notifications/AppointmentNotificationsProvider";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerContext } from "@/lib/context/server";
import { listOutlets } from "@/lib/services/outlets";
import { mediaPublicUrl } from "@/lib/storage/urls";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const ctx = await getServerContext();
	if (!ctx.currentUser) redirect("/login");

	let initialOutletId: string | null = null;
	try {
		const outlets = await listOutlets(ctx);
		initialOutletId = outlets.find((o) => o.is_active)?.id ?? null;
	} catch {
		// outlet fetch failure: provider will lazily pick up via localStorage
	}

	const employeeId = ctx.currentUser.employeeId ?? null;
	let imagePath: string | null = null;
	let fullName: string | null = null;
	let roleName: string | null = null;
	let hasPin = false;
	if (employeeId) {
		const { data } = await ctx.dbAdmin
			.from("employees")
			.select(
				"first_name, last_name, profile_image_path, pin_hash, role:roles(name)",
			)
			.eq("id", employeeId)
			.maybeSingle();
		imagePath = data?.profile_image_path ?? null;
		if (data) {
			fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
			const role = (data as { role?: { name?: string | null } | null }).role;
			roleName = role?.name ?? null;
			hasPin = Boolean(data.pin_hash);
		}
	}

	return (
		<AppointmentNotificationsProvider initialOutletId={initialOutletId}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="min-w-0">
					<AppTopbar
						email={ctx.currentUser.email ?? null}
						name={fullName}
						role={roleName}
						imageUrl={mediaPublicUrl(imagePath)}
						hasPin={hasPin}
					/>
					<main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
						{children}
					</main>
				</SidebarInset>
			</SidebarProvider>
		</AppointmentNotificationsProvider>
	);
}
