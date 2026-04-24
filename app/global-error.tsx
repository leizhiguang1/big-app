"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[global error boundary]", {
			name: error.name,
			message: error.message,
			digest: error.digest,
			stack: error.stack,
		});
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					fontFamily:
						"system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
					background: "#fafafa",
					color: "#171717",
				}}
			>
				<div
					style={{
						minHeight: "100vh",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: 24,
					}}
				>
					<div
						style={{
							maxWidth: 560,
							width: "100%",
							border: "1px solid #fecaca",
							background: "#fef2f2",
							borderRadius: 8,
							padding: 24,
						}}
					>
						<h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#b91c1c" }}>
							Something went wrong
						</h2>
						<p style={{ margin: "0 0 16px", fontSize: 14, color: "#525252" }}>
							The app failed to load. Please try again.
						</p>
						{error.digest ? (
							<div
								style={{
									fontFamily: "monospace",
									fontSize: 12,
									background: "#fff",
									border: "1px solid #e5e5e5",
									padding: "6px 10px",
									borderRadius: 6,
									marginBottom: 16,
									wordBreak: "break-all",
								}}
							>
								digest: {error.digest}
							</div>
						) : null}
						<button
							type="button"
							onClick={() => reset()}
							style={{
								background: "#171717",
								color: "white",
								border: 0,
								padding: "8px 14px",
								borderRadius: 6,
								cursor: "pointer",
								fontSize: 14,
							}}
						>
							Try again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
