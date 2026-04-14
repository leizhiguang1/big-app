import type { Context } from "@/lib/context/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
	outletCreateSchema,
	outletUpdateSchema,
	roomInputSchema,
} from "@/lib/schemas/outlets";
import type { Tables } from "@/lib/supabase/types";

export type Outlet = Tables<"outlets">;
export type Room = Tables<"rooms">;

export type OutletWithRoomCount = Outlet & { room_count: number };

function nullable(value: string | undefined | null): string | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

export async function listOutlets(
	ctx: Context,
): Promise<OutletWithRoomCount[]> {
	const { data, error } = await ctx.db
		.from("outlets")
		.select("*, rooms(count)")
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return (data ?? []).map((row) => {
		const { rooms, ...outlet } = row as Outlet & {
			rooms: { count: number }[] | null;
		};
		return {
			...outlet,
			room_count: rooms?.[0]?.count ?? 0,
		};
	});
}

export async function getOutlet(ctx: Context, id: string): Promise<Outlet> {
	const { data, error } = await ctx.db
		.from("outlets")
		.select("*")
		.eq("id", id)
		.single();
	if (error || !data) throw new NotFoundError(`Outlet ${id} not found`);
	return data;
}

export async function createOutlet(
	ctx: Context,
	input: unknown,
): Promise<Outlet> {
	const parsed = outletCreateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("outlets")
		.insert({
			code: parsed.code.trim().toUpperCase(),
			name: parsed.name,
			address1: nullable(parsed.address1),
			address2: nullable(parsed.address2),
			city: nullable(parsed.city),
			state: nullable(parsed.state),
			postcode: nullable(parsed.postcode),
			country: nullable(parsed.country) ?? "Malaysia",
			phone: nullable(parsed.phone),
			email: nullable(parsed.email),
			is_active: parsed.is_active,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError("An outlet with that code already exists");
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateOutlet(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Outlet> {
	const parsed = outletUpdateSchema.parse(input);
	const { data, error } = await ctx.db
		.from("outlets")
		.update({
			name: parsed.name,
			address1: nullable(parsed.address1),
			address2: nullable(parsed.address2),
			city: nullable(parsed.city),
			state: nullable(parsed.state),
			postcode: nullable(parsed.postcode),
			country: nullable(parsed.country) ?? "Malaysia",
			phone: nullable(parsed.phone),
			email: nullable(parsed.email),
			is_active: parsed.is_active,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw new ValidationError(error.message);
	if (!data) throw new NotFoundError(`Outlet ${id} not found`);
	return data;
}

export async function deleteOutlet(ctx: Context, id: string): Promise<void> {
	const { error } = await ctx.db.from("outlets").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This outlet has rooms, employees or customers linked to it. Remove those first.",
			);
		throw new ValidationError(error.message);
	}
}

export async function listRooms(
	ctx: Context,
	outletId: string,
): Promise<Room[]> {
	const { data, error } = await ctx.db
		.from("rooms")
		.select("*")
		.eq("outlet_id", outletId)
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (error) throw new ValidationError(error.message);
	return data ?? [];
}

export async function createRoom(
	ctx: Context,
	outletId: string,
	input: unknown,
): Promise<Room> {
	const parsed = roomInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("rooms")
		.insert({
			outlet_id: outletId,
			name: parsed.name,
			sort_order: parsed.sort_order,
			is_active: parsed.is_active,
		})
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError(
				"A room with that name already exists at this outlet",
			);
		throw new ValidationError(error.message);
	}
	return data;
}

export async function updateRoom(
	ctx: Context,
	id: string,
	input: unknown,
): Promise<Room> {
	const parsed = roomInputSchema.parse(input);
	const { data, error } = await ctx.db
		.from("rooms")
		.update({
			name: parsed.name,
			sort_order: parsed.sort_order,
			is_active: parsed.is_active,
		})
		.eq("id", id)
		.select("*")
		.single();
	if (error) {
		if (error.code === "23505")
			throw new ConflictError(
				"A room with that name already exists at this outlet",
			);
		throw new ValidationError(error.message);
	}
	if (!data) throw new NotFoundError(`Room ${id} not found`);
	return data;
}

export async function deleteRoom(ctx: Context, id: string): Promise<void> {
	const { data: room, error: lookupError } = await ctx.db
		.from("rooms")
		.select("outlet_id")
		.eq("id", id)
		.single();
	if (lookupError || !room) throw new NotFoundError(`Room ${id} not found`);

	const { count, error: countError } = await ctx.db
		.from("rooms")
		.select("id", { count: "exact", head: true })
		.eq("outlet_id", room.outlet_id);
	if (countError) throw new ValidationError(countError.message);
	if ((count ?? 0) <= 1)
		throw new ValidationError(
			"Each outlet must keep at least one room. Add another room before deleting this one.",
		);

	const { error } = await ctx.db.from("rooms").delete().eq("id", id);
	if (error) {
		if (error.code === "23503")
			throw new ConflictError(
				"This room is linked to existing appointments. Reassign them first.",
			);
		throw new ValidationError(error.message);
	}
}
