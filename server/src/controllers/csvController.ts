import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import * as csvService from "../services/csvService";

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}

function handleImportError(res: Response, err: any) {
  if (err.rowErrors) {
    return res.status(err.status || 400).json({ error: err.message, rowErrors: err.rowErrors });
  }
  return res.status(err.status || 500).json({ error: err.message || "Import failed. No changes were made." });
}

export async function importProducts(req: AuthedRequest, res: Response) {
  try {
    const result = await csvService.importProductsCsv(req.body as string);
    return res.status(201).json(result);
  } catch (err: any) {
    return handleImportError(res, err);
  }
}

export async function importSuppliers(req: AuthedRequest, res: Response) {
  try {
    const result = await csvService.importSuppliersCsv(req.body as string);
    return res.status(201).json(result);
  } catch (err: any) {
    return handleImportError(res, err);
  }
}

export async function exportProducts(_req: AuthedRequest, res: Response) {
  const csv = await csvService.exportProductsCsv();
  return sendCsv(res, "products.csv", csv);
}

export async function exportInventory(_req: AuthedRequest, res: Response) {
  const csv = await csvService.exportInventoryCsv();
  return sendCsv(res, "inventory.csv", csv);
}

export async function exportSales(req: AuthedRequest, res: Response) {
  const csv = await csvService.exportSalesCsv(
    req.query.startDate as string | undefined,
    req.query.endDate as string | undefined
  );
  return sendCsv(res, "sales.csv", csv);
}

export async function exportPurchases(_req: AuthedRequest, res: Response) {
  const csv = await csvService.exportPurchasesCsv();
  return sendCsv(res, "purchases.csv", csv);
}

export async function exportSupplierLedger(req: AuthedRequest, res: Response) {
  const csv = await csvService.exportSupplierLedgerCsv(req.params.id);
  return sendCsv(res, `supplier-ledger-${req.params.id}.csv`, csv);
}

export async function exportSuppliers(_req: AuthedRequest, res: Response) {
  const csv = await csvService.exportSuppliersCsv();
  return sendCsv(res, "suppliers.csv", csv);
}
