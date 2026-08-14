import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import Reorder from "./pages/Reorder";
import Wastage from "./pages/Wastage";
import Stocktake from "./pages/Stocktake";
import AppLayout from "./layouts/AppLayout";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<AppLayout />}
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="reorder" element={<Reorder />} />
        <Route path="wastage" element={<Wastage />} />
        <Route path="stocktake" element={<Stocktake />} />
      </Route>

      <Route path="*" element={<div className="p-8 text-slate-500">Page not found.</div>} />
    </Routes>
  );
}
