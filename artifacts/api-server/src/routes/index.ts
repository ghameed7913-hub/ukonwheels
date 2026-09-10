import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import bookingsRouter from "./bookings.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);

export default router;
