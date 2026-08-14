import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as customerController from "../controllers/customerController";

const router = Router();
router.use(requireAuth);

router.get("/", customerController.listCustomers);
router.post("/", customerController.createCustomer);
router.get("/:id/ledger", customerController.getCustomerLedger);
router.post("/:id/payments", customerController.recordCustomerPayment);

export default router;
