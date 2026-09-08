import { Router, type IRouter } from "express";
import { count, desc, eq, sql, sum } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [totalRow] = await db
    .select({ count: count(), value: sum(bookingsTable.amount) })
    .from(bookingsTable);
  const [activeRow] = await db
    .select({ count: count() })
    .from(bookingsTable)
    .where(sql`${bookingsTable.status} NOT IN ('Delivered', 'Cancelled')`);
  const [deliveredRow] = await db
    .select({ count: count() })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "Delivered"));
  const statusRows = await db
    .select({ status: bookingsTable.status, count: count() })
    .from(bookingsTable)
    .groupBy(bookingsTable.status);
  const recent = await db
    .select()
    .from(bookingsTable)
    .orderBy(desc(bookingsTable.createdAt))
    .limit(5);

  const dashboard = {
    metrics: [
      { label: "Active bookings", value: String(activeRow.count), change: "Live workload" },
      { label: "Pipeline value", value: `£${Number(totalRow.value || 0).toLocaleString()}`, change: "All bookings" },
      { label: "Delivered", value: String(deliveredRow.count), change: "Completed jobs" },
      { label: "Total bookings", value: String(totalRow.count), change: "All time" },
    ],
    statusCounts: statusRows,
    recentBookings: recent.map((row) => ({
      ...row,
      amount: Number(row.amount),
      createdAt: row.createdAt.toISOString(),
    })),
    activity: recent.slice(0, 4).map((row, index) => ({
      id: row.id,
      title: index === 0 ? "Booking activity updated" : "Vehicle movement recorded",
      detail: `${row.reference} · ${row.customer} · ${row.status}`,
      occurredAt: row.updatedAt.toISOString(),
      tone: row.status === "Delivered" ? "success" : row.status === "Pending" ? "warning" : "info",
    })),
  };

  res.json(GetDashboardResponse.parse(dashboard));
});

export default router;