import { Router, type Request, type Response } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import {
  CreateBookingBody,
  CreateBookingResponse,
  GetBookingParams,
  GetBookingResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
  UpdateBookingBody,
  UpdateBookingParams,
  UpdateBookingResponse,
} from "@workspace/api-zod";

const router = Router();

const serializeBooking = (row: typeof bookingsTable.$inferSelect) => ({
  ...row,
  amount: Number(row.amount),
  createdAt: row.createdAt.toISOString(),
});

router.get("/bookings", async (req: Request, res: Response): Promise<void> => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [];
  if (parsed.data.status) filters.push(eq(bookingsTable.status, parsed.data.status));
  if (parsed.data.search) {
    const term = `%${parsed.data.search}%`;
    filters.push(
      or(
        ilike(bookingsTable.reference, term),
        ilike(bookingsTable.customer, term),
        ilike(bookingsTable.vehicle, term),
        ilike(bookingsTable.registration, term),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(bookingsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookingsTable.createdAt));
  res.json(ListBookingsResponse.parse(rows.map(serializeBooking)));
});

router.post("/bookings", async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const reference = `UKW-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const [row] = await db
    .insert(bookingsTable)
    .values({
      ...parsed.data,
      reference,
      collectionDate: parsed.data.collectionDate.toISOString().slice(0, 10),
      amount: String(parsed.data.amount),
      driver: parsed.data.driver || "Unassigned",
    })
    .returning();
  res.status(201).json(CreateBookingResponse.parse(serializeBooking(row)));
});

router.get("/bookings/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(GetBookingResponse.parse(serializeBooking(row)));
});

router.patch("/bookings/:id", async (req: Request, res: Response): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  const body = UpdateBookingBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .update(bookingsTable)
    .set({
      ...body.data,
      amount:
        body.data.amount === undefined ? undefined : String(body.data.amount),
    })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(UpdateBookingResponse.parse(serializeBooking(row)));
});

export default router;