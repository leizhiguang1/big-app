import { InboxClient } from "./inbox-client";

export const dynamic = "force-dynamic";

export default function InboxPage() {
	return (
		<div className="-mx-4 -my-4 flex min-h-0 flex-1 md:-mx-6 md:-my-6">
			<InboxClient />
		</div>
	);
}
