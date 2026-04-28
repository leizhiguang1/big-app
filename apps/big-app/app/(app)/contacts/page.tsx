import { ContactsClient } from "./contacts-client";

export const dynamic = "force-dynamic";

export default function ContactsPage() {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-lg">WhatsApp Contacts</h2>
				<p className="text-muted-foreground text-sm">
					CRM metadata for your WhatsApp contacts. Separate from the Customers
					module.
				</p>
			</div>
			<ContactsClient />
		</div>
	);
}
