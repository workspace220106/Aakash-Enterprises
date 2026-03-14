import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import customersRouter from "./customers.js";
import salesRouter from "./sales.js";
import analyticsRouter from "./analytics.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(salesRouter);
router.use(analyticsRouter);

export default router;
