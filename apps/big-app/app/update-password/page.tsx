import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
	const db = await createClient();
	const {
		data: { user },
	} = await db.auth.getUser();

	// Must have an active session (set by /auth/callback)
	if (!user) redirect("/login");

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="mb-6">
					<h1 className="font-semibold text-xl">Set Your Password</h1>
					<p className="text-muted-foreground text-sm">
						Choose a new password for your account.
					</p>
				</div>
				<UpdatePasswordForm />
			</div>
		</main>
	);
}
