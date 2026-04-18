import { FileText } from "lucide-react";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";

type Props = {
	documents: CustomerDocumentWithRefs[];
};

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function CustomerDocumentsTab({ documents }: Props) {
	if (documents.length === 0) {
		return (
			<div className="rounded-md border bg-muted/30 p-12 text-center text-muted-foreground text-sm">
				No documents uploaded.
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-card shadow-sm">
			<table className="w-full text-[13px]">
				<thead>
					<tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
						<th className="px-3 py-2 text-left font-medium">File</th>
						<th className="px-3 py-2 text-left font-medium">Type</th>
						<th className="px-3 py-2 text-right font-medium">Size</th>
						<th className="px-3 py-2 text-left font-medium">Uploaded</th>
						<th className="px-3 py-2 text-left font-medium">Uploaded By</th>
					</tr>
				</thead>
				<tbody>
					{documents.map((doc) => (
						<tr
							key={doc.id}
							className="border-b last:border-b-0 hover:bg-muted/30"
						>
							<td className="px-3 py-2">
								<div className="flex items-center gap-2">
									<FileText className="size-4 shrink-0 text-muted-foreground" />
									<span className="font-medium">{doc.file_name}</span>
								</div>
							</td>
							<td className="px-3 py-2 text-muted-foreground text-[12px]">
								{doc.mime_type}
							</td>
							<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
								{formatSize(doc.size_bytes)}
							</td>
							<td className="px-3 py-2">{formatDate(doc.created_at)}</td>
							<td className="px-3 py-2 text-muted-foreground">
								{doc.uploaded_by
									? `${doc.uploaded_by.first_name} ${doc.uploaded_by.last_name}`
									: "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
