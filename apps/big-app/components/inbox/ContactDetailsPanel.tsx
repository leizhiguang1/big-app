"use client";

import {
	ALL_INBOX_CHANNELS,
	INBOX_CHANNEL_LABELS,
	type InboxContact,
	type InboxContactHandles,
} from "@aimbig/wa-client";
import { ChannelBadge } from "./ChannelBadge";

function initials(name: string) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).slice(0, 2);
	return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ContactDetailsPanel({
	contact,
	handles,
}: {
	contact: InboxContact | null;
	handles: InboxContactHandles;
}) {
	if (!contact) {
		return (
			<div className="inbox-contact-panel">
				<div className="inbox-contact-empty">No contact selected</div>
			</div>
		);
	}

	return (
		<div className="inbox-contact-panel">
			<div className="inbox-contact-header">
				<div className="inbox-contact-avatar">
					{contact.avatarUrl ? (
						<img src={contact.avatarUrl} alt="" />
					) : (
						<span>{initials(contact.name)}</span>
					)}
				</div>
				<div className="inbox-contact-name">{contact.name}</div>
				{contact.crmStatus && (
					<div className="inbox-contact-status">{contact.crmStatus}</div>
				)}
			</div>

			<div className="inbox-contact-section">
				<h4>Details</h4>
				{contact.email && (
					<div className="inbox-contact-row">
						<span className="inbox-contact-label">Email</span>
						<span className="inbox-contact-value">{contact.email}</span>
					</div>
				)}
				{contact.phone && (
					<div className="inbox-contact-row">
						<span className="inbox-contact-label">Phone</span>
						<span className="inbox-contact-value">{contact.phone}</span>
					</div>
				)}
				{contact.birthday && (
					<div className="inbox-contact-row">
						<span className="inbox-contact-label">Birthday</span>
						<span className="inbox-contact-value">{contact.birthday}</span>
					</div>
				)}
				{contact.assignedUser && (
					<div className="inbox-contact-row">
						<span className="inbox-contact-label">Assigned</span>
						<span className="inbox-contact-value">{contact.assignedUser}</span>
					</div>
				)}
			</div>

			{contact.tags?.length > 0 && (
				<div className="inbox-contact-section">
					<h4>Tags</h4>
					<div className="inbox-contact-tags">
						{contact.tags.map((t) => (
							<span key={t} className="inbox-contact-tag">
								{t}
							</span>
						))}
					</div>
				</div>
			)}

			<div className="inbox-contact-section">
				<h4>Channels</h4>
				<div className="inbox-contact-channels">
					{ALL_INBOX_CHANNELS.map((ch) => {
						const handle = handles[ch];
						const enabled = !!handle;
						return (
							<div
								key={ch}
								className={`inbox-contact-channel${enabled ? "" : " inbox-contact-channel--disabled"}`}
								title={enabled ? handle : "Not connected"}
							>
								<ChannelBadge channel={ch} size="sm" />
								<span className="inbox-contact-channel-label">
									{INBOX_CHANNEL_LABELS[ch]}
								</span>
								<span className="inbox-contact-channel-handle">
									{enabled ? handle : "—"}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{contact.notes && (
				<div className="inbox-contact-section">
					<h4>Notes</h4>
					<div className="inbox-contact-notes">{contact.notes}</div>
				</div>
			)}
		</div>
	);
}
