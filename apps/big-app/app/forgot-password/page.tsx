import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function ForgotPasswordPage({
	searchParams,
}: { searchParams: Promise<{ email?: string }> }) {
	const { email: initialEmail } = await searchParams;
	const db = await createClient();
	const {
		data: { user },
	} = await db.auth.getUser();
	if (user) redirect("/");

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="mb-6">
					<h1 className="font-semibold text-xl">Reset Password</h1>
					<p className="text-muted-foreground text-sm">
						Enter your email and we'll send you a reset link. If email
						isn't set up, ask your admin to reset it for you.
					</p>
				</div>
				<ForgotPasswordForm initialEmail={initialEmail} />
			</div>
		</main>
	);
}
