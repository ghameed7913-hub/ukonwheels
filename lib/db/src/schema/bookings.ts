import {
  date,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  customer: text("customer").notNull(),
  vehicle: text("vehicle").notNull(),
  registration: text("registration").notNull().default(""),
  pickup: text("pickup").notNull(),
  destination: text("destination").notNull(),
  collectionDate: date("collection_date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("Pending"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  driver: text("driver").notNull().default("Unassigned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingRecord = typeof bookingsTable.$inferSelect;