import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import SalesHistory from "./pages/SalesHistory";
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
import ReportsCredit from "./pages/Reports/ReportsCredit";
import ReportsStock from "./pages/Reports/ReportsStock";
import ReportsProfit from "./pages/Reports/ReportsProfit";
import ReportsUnifiedTimeline from "./pages/Reports/ReportsUnifiedTimeline";
import Expenses from "./pages/Expenses";
import ReportsAudit from "./pages/Reports/ReportsAudit";
import AppLayout from "./layouts/AppLayout";
import OrdersList from "./pages/Orders/OrdersList";
import CreateOrder from "./pages/Orders/CreateOrder";
import OrderFulfilment from "./pages/Orders/OrderFulfilment";
import OrderVerification from "./pages/Orders/OrderVerification";
import CustomersList from "./pages/Customers/CustomersList";
import CustomerLedger from "./pages/Customers/CustomerLedger";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isOwner, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (!isOwner) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="sales-history" element={<SalesHistory />} />
        <Route path="products" element={<Products />} />
        <Route path="customers" element={<CustomersList />} />
        <Route path="customers/:id" element={<CustomerLedger />} />
        <Route path="credit" element={<ReportsCredit />} />
        
        {/* Owner Only Routes */}
        <Route path="purchases" element={<OwnerRoute><Purchases /></OwnerRoute>} />
        <Route path="suppliers" element={<OwnerRoute><Suppliers /></OwnerRoute>} />
        <Route path="expenses" element={<OwnerRoute><Expenses /></OwnerRoute>} />
        
        <Route path="reorder" element={<Reorder />} />
        <Route path="wastage" element={<Wastage />} />
        <Route path="stocktake" element={<Stocktake />} />
        
        {/* Orders Module */}
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/create" element={<CreateOrder />} />
        <Route path="orders/:id/pick" element={<OrderFulfilment />} />
        <Route path="orders/:id/checkout" element={<OrderVerification />} />
        
        {/* Reports Module - Owner Only */}
        <Route path="reports" element={<OwnerRoute><ReportsLayout /></OwnerRoute>}>
          <Route index element={<ReportsOverview />} />
          <Route path="sales" element={<ReportsSales />} />
          <Route path="purchases" element={<ReportsPurchases />} />
          <Route path="credit" element={<ReportsCredit />} />
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
