import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import * as productService from "../services/productService";
import {
  createProductSchema,
  updateProductSchema,
  searchProductsQuerySchema,
} from "../validators/productValidators";
import { Product } from "../models/Product";

export async function listProducts(req: AuthedRequest, res: Response) {
  const parsed = searchProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  const { q, category, active, page, limit } = parsed.data;
  const result = await productService.searchProducts({
    q,
    category,
    active: active === undefined ? undefined : active === "true",
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  return res.json(result);
}

export async function getProduct(req: AuthedRequest, res: Response) {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json({ product: productService.withReorderStatus(product) });
}

export async function createProduct(req: AuthedRequest, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const product = await productService.createProduct(parsed.data, req.user!.userId);
    return res.status(201).json({ product });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateProduct(req: AuthedRequest, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const isOwner = req.user!.role === "OWNER" || req.user!.role === "ADMIN";
    const product = await productService.updateProduct(
      req.params.id,
      parsed.data,
      req.user!.userId,
      isOwner
    );
    return res.json({ product });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function deactivateProduct(req: AuthedRequest, res: Response) {
  try {
    const product = await productService.deactivateProduct(req.params.id, req.user!.userId);
    return res.json({ product });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function deleteProduct(req: AuthedRequest, res: Response) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ message: "Product deleted" });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
