"use client";

import { useState } from "react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TEMPLATE_TYPES = [
	"Create Customer",
	"Service Review",
	"Product Review",
	"Create Appointment",
	"Appointment Reminder",
	"Follow Up",
	"Receipts",
	"Drugs Replenishment",
];

const TEMPLATE_TAGS = [
	"APPT_REF",
	"APPT_STARTTIME",
	"BUSINESS_CONTACT",
	"BUSINESS_NAME",
	"BUSINESS_NICKNAME",
	"BUSINESS_SUBDOMAIN",
	"CUSTOMER_LINK",
	"LOCATION_VIDEO",
	"MEMBER_ID",
	"OUTLET_CONTACT",
	"OUTLET_NAME",
	"OUTLET_NICKNAME",
	"PASSWORD",
	"SUBDOMAIN_NAME",
];

const DEFAULT_CONTENT = `Dear {CUSTOMER_NAME},
Thank you for registering with {BUSINESS_NAME}.
Browse through our online store in {SUBDOMAIN_NAME}.aoikumo.com/webstore to make purchases and booking.
<br>Thank you,
{BUSINESS_NAME}`;

export function EmailSettingsTab() {
	const [activeTemplate, setActiveTemplate] = useState("Create Customer");

	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card>
				<CardContent className="pt-6">
					<SettingToggleRow
						label="Enable E-Mail Notification Messages"
						hint="Activates automated email notifications for the selected events."
						defaultChecked
					/>
				</CardContent>
			</Card>

			{/* Template type selector */}
			<div className="flex flex-wrap gap-2">
				{TEMPLATE_TYPES.map((t) => (
					<Button
						key={t}
						variant={activeTemplate === t ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTemplate(t)}
						className="h-8"
					>
						{t}
					</Button>
				))}
			</div>

			<Card>
				<CardContent className="pt-6">
					<SettingToggleRow
						label={`Enable ${activeTemplate} Messages`}
						hint="Send this notification type to customers."
					/>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Tags reference */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Message Settings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-muted-foreground text-xs">
							Message types setup here will be automatically sent to clients. Adjust the settings for how and when messages are sent, and edit the templates to personalize the text.
						</p>
						<p className="text-muted-foreground text-xs">
							Use the tags below to include appointment details inside messages:
						</p>
						<div className="flex flex-wrap gap-1.5 pt-1">
							{TEMPLATE_TAGS.map((tag) => (
								<code
									key={tag}
									className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
								>
									{`{${tag}}`}
								</code>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Email template editor */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Template — {activeTemplate}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label>Email Subject</Label>
							<Input defaultValue="Thank you for joining us" />
						</div>
						<div className="space-y-1.5">
							<Label>Email Content</Label>
							<Textarea
								className={cn("min-h-40 font-mono text-xs")}
								defaultValue={DEFAULT_CONTENT}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm">Reset</Button>
							<Button size="sm">Save</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
