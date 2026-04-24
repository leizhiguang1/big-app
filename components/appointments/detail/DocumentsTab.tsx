"use client";

import {
	Download,
	Eye,
	FileText,
	Image as ImageIcon,
	Trash2,
	Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { Toast } from "@/components/appointments/AppointmentToastStack";
import { DocumentPreviewDialog } from "@/components/customer-documents/DocumentPreviewDialog";
import { UploadDocumentDialog } from "@/components/customer-documents/UploadDocumentDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	createCustomerDocumentAction,
	deleteCustomerDocumentAction,
	getCustomerDocumentSignedUrlAction,
	requestCustomerDocumentUploadUrlAction,
} from "@/lib/actions/customer-documents";
import {
	CUSTOMER_DOCUMENT_MAX_BYTES,
	CUSTOMER_DOCUMENT_MIME_TYPES,
} from "@/lib/schemas/customer-documents";
import type { AppointmentWithRelations } from "@/lib/services/appointments";
import type { CustomerDocumentWithRefs } from "@/lib/services/customer-documents";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Scope = "visit" | "all";

type Props = {
	appointment: AppointmentWithRelations;
	documents: CustomerDocumentWithRefs[];
	onToast: (message: string, variant?: Toast["variant"]) => void;
};

const ACCEPT_ATTR = CUSTOMER_DOCUMENT_MIME_TYPES.join(",");

function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return `${d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	})} · ${d.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})}`;
}

function uploaderLabel(doc: CustomerDocumentWithRefs): string {
	if (!doc.uploaded_by) return "—";
	return `${doc.uploaded_by.first_name} ${doc.uploaded_by.last_name}`.trim();
}

function fileKind(mime: string): "image" | "pdf" {
	return mime === "application/pdf" ? "pdf" : "image";
}

export function DocumentsTab({ appointment, documents, onToast }: Props) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [scope, setScope] = useState<Scope>("visit");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [previewDoc, setPreviewDoc] = useState<CustomerDocumentWithRefs | null>(
		null,
	);

	const isBlock = appointment.is_time_block;
	const isLead = !isBlock && !appointment.customer_id;
	const customerId = appointment.customer_id;

	if (isBlock) {
		return (
			<div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground text-sm">
				Documents don't apply to time blocks.
			</div>
		);
	}

	if (isLead) {
		return (
			<div className="rounded-md border bg-amber-50 p-6 text-center text-amber-900 text-sm">
				Register this walk-in lead as a customer to attach documents.
			</div>
		);
	}

	const refresh = () => router.refresh();

	const stageFile = (file: File) => {
		if (!CUSTOMER_DOCUMENT_MIME_TYPES.includes(file.type as never)) {
			onToast("Use JPG, PNG, WebP, or PDF", "error");
			if (inputRef.current) inputRef.current.value = "";
			return;
		}
		if (file.size > CUSTOMER_DOCUMENT_MAX_BYTES) {
			onToast("Max file size is 20 MB", "error");
			if (inputRef.current) inputRef.current.value = "";
			return;
		}
		setPendingFile(file);
	};

	const clearPending = () => {
		setPendingFile(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	const handleUploadConfirm = async (displayName: string) => {
		if (!pendingFile || !customerId) return;
		const file = pendingFile;
		setUploading(true);
		try {
			const { token, path } = await requestCustomerDocumentUploadUrlAction({
				customerId,
				filename: file.name,
				mime: file.type,
			});
			const supabase = createClient();
			const { error: upErr } = await supabase.storage
				.from("documents")
				.uploadToSignedUrl(path, token, file, {
					contentType: file.type,
					upsert: false,
				});
			if (upErr) throw upErr;

			await createCustomerDocumentAction(appointment.id, {
				customer_id: customerId,
				appointment_id: appointment.id,
				uploaded_by_id: appointment.employee_id ?? null,
				storage_path: path,
				file_name: displayName,
				mime_type: file.type,
				size_bytes: file.size,
			});
			onToast("Document uploaded", "success");
			clearPending();
			refresh();
		} catch (err) {
			onToast(err instanceof Error ? err.message : "Upload failed", "error");
		} finally {
			setUploading(false);
		}
	};

	const handleDownload = async (doc: CustomerDocumentWithRefs) => {
		try {
			const url = await getCustomerDocumentSignedUrlAction(doc.id);
			const a = document.createElement("a");
			a.href = url;
			a.download = doc.file_name;
			a.rel = "noopener noreferrer";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (err) {
			onToast(
				err instanceof Error ? err.message : "Could not download",
				"error",
			);
		}
	};

	const handleDelete = () => {
		if (!deleteId) return;
		const id = deleteId;
		startTransition(async () => {
			try {
				await deleteCustomerDocumentAction(appointment.id, id);
				setDeleteId(null);
				onToast("Document deleted", "success");
				refresh();
			} catch (err) {
				onToast(
					err instanceof Error ? err.message : "Could not delete document",
					"error",
				);
			}
		});
	};

	const visible = documents.filter((d) =>
		scope === "visit" ? d.appointment_id === appointment.id : true,
	);

	const visitCount = documents.filter(
		(d) => d.appointment_id === appointment.id,
	).length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
				<Button
					type="button"
					size="sm"
					onClick={() => inputRef.current?.click()}
					disabled={uploading}
				>
					<Upload className="size-3.5" />
					Upload file
				</Button>
				<p className="text-muted-foreground text-xs">
					JPG, PNG, WebP, or PDF · max 20 MB · attached to this visit
				</p>
				<div className="ml-auto flex items-center gap-1 rounded-md border bg-background p-0.5 text-xs">
					<button
						type="button"
						onClick={() => setScope("visit")}
						className={cn(
							"rounded px-2 py-1 font-medium",
							scope === "visit"
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						This visit ({visitCount})
					</button>
					<button
						type="button"
						onClick={() => setScope("all")}
						className={cn(
							"rounded px-2 py-1 font-medium",
							scope === "all"
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						All for customer ({documents.length})
					</button>
				</div>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPT_ATTR}
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) stageFile(file);
					}}
				/>
			</div>

			<div className="rounded-md border bg-card">
				{visible.length === 0 ? (
					<div className="flex flex-col items-center gap-2 p-10 text-center">
						<FileText className="size-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							{scope === "visit"
								? "No documents on this visit yet."
								: "No documents for this customer yet."}
						</p>
					</div>
				) : (
					<ul className="divide-y">
						{visible.map((doc) => (
							<DocumentRow
								key={doc.id}
								doc={doc}
								isCurrentVisit={doc.appointment_id === appointment.id}
								onView={() => setPreviewDoc(doc)}
								onDownload={() => handleDownload(doc)}
								onDelete={() => setDeleteId(doc.id)}
							/>
						))}
					</ul>
				)}
			</div>

			<ConfirmDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && setDeleteId(null)}
				title="Delete this document?"
				description="The file will be removed from storage and can't be recovered."
				confirmLabel="Delete"
				pending={pending}
				onConfirm={handleDelete}
			/>

			<UploadDocumentDialog
				open={pendingFile !== null}
				onOpenChange={(o) => {
					if (!o) clearPending();
				}}
				file={pendingFile}
				uploading={uploading}
				onConfirm={(name) => void handleUploadConfirm(name)}
			/>

			<DocumentPreviewDialog
				doc={previewDoc}
				onOpenChange={(o) => {
					if (!o) setPreviewDoc(null);
				}}
				onError={(msg) => onToast(msg, "error")}
			/>
		</div>
	);
}

function DocumentRow({
	doc,
	isCurrentVisit,
	onView,
	onDownload,
	onDelete,
}: {
	doc: CustomerDocumentWithRefs;
	isCurrentVisit: boolean;
	onView: () => void;
	onDownload: () => void;
	onDelete: () => void;
}) {
	const kind = fileKind(doc.mime_type);
	const hasThumb = kind === "image" && doc.preview_url;
	return (
		<li className="flex items-center gap-3 px-3 py-2.5">
			<button
				type="button"
				onClick={onView}
				aria-label={`Preview ${doc.file_name}`}
				className={cn(
					"flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border transition hover:ring-2 hover:ring-ring/50",
					!hasThumb && kind === "image" && "bg-sky-50 text-sky-600",
					!hasThumb && kind === "pdf" && "bg-rose-50 text-rose-600",
				)}
			>
				{hasThumb ? (
					// eslint-disable-next-line @next/next/no-img-element -- signed URL, short TTL, not worth next/image
					<img
						src={doc.preview_url as string}
						alt={doc.file_name}
						className="size-full object-cover"
						loading="lazy"
					/>
				) : kind === "image" ? (
					<ImageIcon className="size-4" />
				) : (
					<FileText className="size-4" />
				)}
			</button>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onView}
						className="truncate text-left font-medium text-sm hover:underline"
					>
						{doc.file_name}
					</button>
					{isCurrentVisit && (
						<span className="rounded bg-blue-600 px-1.5 py-px font-bold text-[9px] text-white uppercase tracking-wide">
							This visit
						</span>
					)}
				</div>
				<div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground text-xs">
					<span>{formatBytes(doc.size_bytes)}</span>
					<span>·</span>
					<span>{formatDateTime(doc.created_at)}</span>
					<span>·</span>
					<span>{uploaderLabel(doc)}</span>
					{doc.appointment && !isCurrentVisit && (
						<>
							<span>·</span>
							<span className="font-mono tabular-nums">
								{doc.appointment.booking_ref}
							</span>
						</>
					)}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onClick={onView}
					aria-label="View"
					title="View"
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Eye className="size-4" />
				</button>
				<button
					type="button"
					onClick={onDownload}
					aria-label="Download"
					title="Download"
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Download className="size-4" />
				</button>
				<button
					type="button"
					onClick={onDelete}
					aria-label="Delete"
					title="Delete"
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
		</li>
	);
}
