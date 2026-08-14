export type UserRole = "OWNER" | "STAFF" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

export interface Product {
  _id: string;
  productCode: string;
  productName: string;
  hindiName?: string;
  category: string;
  stockUnit: string;
  purchaseUnit: string;
  salesUnit: string;
  conversionFactor: number;
  sellingPricePaise: number;
  purchaseCostPaise: number;
  gstRate: number;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  active: boolean;
  reorderStatus?: "OK" | "LOW" | "ORDER_REQUIRED" | "OUT_OF_STOCK";
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface Supplier {
  _id: string;
  supplierName: string;
  phone?: string;
  currentOutstandingPaise: number;
}
