import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import Reorder from "./pages/Reorder";
import Wastage from "./pages/Wastage";
import Stocktake from "./pages/Stocktake";
import ReportsLayout from "./pages/Reports/ReportsLayout";
import ReportsOverview from "./pages/Reports/ReportsOverview";
import ReportsSales from "./pages/Reports/ReportsSales";
import ReportsPurchases from "./pages/Reports/ReportsPurchases";
import ReportsStock from "./pages/Reports/ReportsStock";
import ReportsProfit from "./pages/Reports/ReportsProfit";
import ReportsUnifiedTimeline from "./pages/Reports/ReportsUnifiedTimeline";
import ReportsAudit from "./pages/Reports/ReportsAudit";
import AppLayout from "./layouts/AppLayout";
import OrdersList from "./pages/Orders/OrdersList";
import CreateOrder from "./pages/Orders/CreateOrder";
import OrderFulfilment from "./pages/Orders/OrderFulfilment";
import OrderVerification from "./pages/Orders/OrderVerification";

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
        
        {/* Orders Module */}
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/create" element={<CreateOrder />} />
        <Route path="orders/:id/pick" element={<OrderFulfilment />} />
        <Route path="orders/:id/checkout" element={<OrderVerification />} />
        
        {/* Reports Module */}
        <Route path="reports" element={<ReportsLayout />}>
          <Route index element={<ReportsOverview />} />
          <Route path="sales" element={<ReportsSales />} />
          <Route path="purchases" element={<ReportsPurchases />} />
          <Route path="stock" element={<ReportsStock />} />
          <Route path="profit" element={<ReportsProfit />} />
          <Route path="transactions" element={<ReportsUnifiedTimeline />} />
          <Route path="audit" element={<ReportsAudit />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-8 text-slate-500">Page not found.</div>} />
    </Routes>
  );
}
