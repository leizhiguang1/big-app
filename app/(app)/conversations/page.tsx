export default function ConversationsPage() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-lg">Conversations</h2>
				<p className="text-muted-foreground text-sm">
					Channel-agnostic inbox. Coming next — we&apos;ll port the chat UI from
					the Aoikumo reference once WhatsApp pairing is proven.
				</p>
			</div>
			<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
				Pair an outlet on the <strong>WhatsApp</strong> page first, then this
				page will show live conversations.
			</div>
		</div>
	);
}
