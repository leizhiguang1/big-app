import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
	const db = await createClient();
	const {
		data: { user },
	} = await db.auth.getUser();
	if (user) redirect("/dashboard");

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
			<div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
				<div className="mb-6">
					<h1 className="font-semibold text-xl">Sign in to BIG</h1>
					<p className="text-muted-foreground text-sm">
						Use the email and password set by your admin.
					</p>
				</div>
				<LoginForm />
			</div>
		</main>
	);
}
