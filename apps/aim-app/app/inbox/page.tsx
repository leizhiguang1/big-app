import { CHAT_UI_PLACEHOLDER } from "@aimbig/chat-ui";
import { CLIENT_EVENTS, SERVER_EVENTS } from "@aimbig/wa-client";

export default function InboxPage() {
	return (
		<main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<h1>aim-app inbox</h1>
			<p>Package boundary check:</p>
			<ul>
				<li>
					<code>@aimbig/chat-ui</code>: {CHAT_UI_PLACEHOLDER}
				</li>
				<li>
					<code>@aimbig/wa-client</code>: resolves with{" "}
					{Object.keys(SERVER_EVENTS).length} server events,{" "}
					{Object.keys(CLIENT_EVENTS).length} client events
				</li>
			</ul>
			<p>
				If both lines render, the workspace is wired correctly. Replace this
				page with real content when aim-app development starts.
			</p>
		</main>
	);
}
