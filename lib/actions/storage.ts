"use server";

import { getServerContext } from "@/lib/context/server";
import {
	buildEntityPath,
	createSignedUploadUrl,
	deleteObject,
	type MediaEntity,
} from "@/lib/services/storage";

export async function requestMediaUploadUrlAction(args: {
	entity: MediaEntity;
	entityId: string;
	filename: string;
	mime: string;
}) {
	const ctx = await getServerContext();
	const path = buildEntityPath({
		entity: args.entity,
		entityId: args.entityId,
		filename: args.filename,
		mime: args.mime,
	});
	return createSignedUploadUrl(ctx, "media", path);
}

export async function deleteMediaObjectAction(path: string) {
	const ctx = await getServerContext();
	await deleteObject(ctx, "media", path);
}
