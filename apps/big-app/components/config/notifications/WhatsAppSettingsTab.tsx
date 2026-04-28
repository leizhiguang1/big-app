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
	"Appointment Reminder",
	"Appointment Confirmation",
	"Appointment Cancellation",
	"Birthday Greeting",
	"Follow Up",
	"Promotional Message",
];

const TEMPLATE_TAGS = [
	"APPT_REF",
	"APPT_STARTTIME",
	"BUSINESS_NAME",
	"CUSTOMER_NAME",
	"OUTLET_NAME",
	"OUTLET_CONTACT",
];

const DEFAULT_CONTENT = `Hi {CUSTOMER_NAME} 👋
Your appointment at *{OUTLET_NAME}* is confirmed for *{APPT_STARTTIME}*.
Ref: {APPT_REF}
Thank you, _{BUSINESS_NAME}_`;

export function WhatsAppSettingsTab() {
	const [activeTemplate, setActiveTemplate] = useState("Appointment Reminder");

	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardContent className="space-y-4 pt-6">
					<SettingToggleRow
						label="Enable WhatsApp Notification Messages"
						hint="Activates automated WhatsApp notifications via the connected WhatsApp Business account."
					/>
					<div className="space-y-1.5">
						<Label>WhatsApp Business Phone Number</Label>
						<Input placeholder="+60 12-345 6789" className="max-w-xs" />
					</div>
					<SettingToggleRow
						label="Send notifications through wa-connector service"
						hint="Routes messages through the internal wa-connector for delivery."
						defaultChecked
					/>
				</CardContent>
			</Card>

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
						hint="Send this notification type to customers via WhatsApp."
					/>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Available Tags</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-muted-foreground text-xs">
							Use these tags to personalise WhatsApp messages. Wrap text in *asterisks* for bold and _underscores_ for italic.
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

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Template — {activeTemplate}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1.5">
							<Label>Message Content</Label>
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
