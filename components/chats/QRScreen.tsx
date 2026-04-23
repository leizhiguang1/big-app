"use client";

export function QRScreen({ qrDataUrl }: { qrDataUrl: string | null }) {
	return (
		<div className="center-screen">
			<div className="qr-card">
				<h1 className="qr-title">WhatsApp</h1>
				<p className="qr-subtitle">Link your WhatsApp account</p>

				{qrDataUrl ? (
					<div className="qr-image-wrapper">
						<img
							src={qrDataUrl}
							alt="WhatsApp QR Code"
							className="qr-image"
						/>
					</div>
				) : (
					<div className="qr-placeholder">
						<div className="loading-spinner" />
						<p>Generating QR code…</p>
					</div>
				)}

				<ol className="qr-instructions">
					<li>Open WhatsApp on your phone</li>
					<li>
						Tap <strong>More options</strong> or <strong>Settings</strong>
					</li>
					<li>
						Select <strong>Linked devices</strong>
					</li>
					<li>
						Tap <strong>Link a device</strong>
					</li>
					<li>Scan this QR code</li>
				</ol>
			</div>
		</div>
	);
}
