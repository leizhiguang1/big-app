import { CHAT_UI_PLACEHOLDER } from "@aimbig/chat-ui";
import { WA_CLIENT_PLACEHOLDER } from "@aimbig/wa-client";

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
          <code>@aimbig/wa-client</code>: {WA_CLIENT_PLACEHOLDER}
        </li>
      </ul>
      <p>
        If both lines render, the workspace is wired correctly. Replace this
        page with real content when aim-app development starts.
      </p>
    </main>
  );
}
