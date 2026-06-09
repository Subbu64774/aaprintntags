import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spin } from 'antd';
import AppLayout from './AppLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import CustomerListPage from './pages/customers/CustomerListPage.jsx';
import CustomerFormPage from './pages/customers/CustomerFormPage.jsx';
import CustomerViewPage from './pages/customers/CustomerViewPage.jsx';
import ProductListPage from './pages/products/ProductListPage.jsx';
import ProductFormPage from './pages/products/ProductFormPage.jsx';
import ProductViewPage from './pages/products/ProductViewPage.jsx';
import OrderListPage from './pages/orders/OrderListPage.jsx';
import OrderFormPage from './pages/orders/OrderFormPage.jsx';
import OrderViewPage from './pages/orders/OrderViewPage.jsx';
import InvoiceListPage from './pages/invoices/InvoiceListPage.jsx';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage.jsx';
import InvoiceViewPage from './pages/invoices/InvoiceViewPage.jsx';
import QuoteListPage from './pages/quotes/QuoteListPage.jsx';
import QuoteFormPage from './pages/quotes/QuoteFormPage.jsx';
import QuoteViewPage from './pages/quotes/QuoteViewPage.jsx';
import PaymentListPage from './pages/payments/PaymentListPage.jsx';
import PaymentFormPage from './pages/payments/PaymentFormPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import EmployeeListPage from './pages/employees/EmployeeListPage.jsx';
import EmployeeFormPage from './pages/employees/EmployeeFormPage.jsx';
import EmployeeViewPage from './pages/employees/EmployeeViewPage.jsx';
import TenantListPage from './pages/tenants/TenantListPage.jsx';
import TenantFormPage from './pages/tenants/TenantFormPage.jsx';
import ProductionUnitListPage from './pages/productionunits/ProductionUnitListPage.jsx';
import ProductionUnitFormPage from './pages/productionunits/ProductionUnitFormPage.jsx';
import UserListPage from './pages/users/UserListPage.jsx';
import UserFormPage from './pages/users/UserFormPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

// Role-aware landing: product owner (ADMIN) → Tenants, tenant users → Dashboard
function HomeRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/tenants' : '/dashboard'} replace />;
}

function ManagerRoute({ children }) {
  const { isAdmin, isManager } = useAuth();
  return (isAdmin || isManager) ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<HomeRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/:id" element={<CustomerViewPage />} />
          <Route path="customers/:id/edit" element={<CustomerFormPage />} />

          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductViewPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />

          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/new" element={<OrderFormPage />} />
          <Route path="orders/:id" element={<OrderViewPage />} />
          <Route path="orders/:id/edit" element={<OrderFormPage />} />

          <Route path="invoices" element={<InvoiceListPage />} />
          <Route path="invoices/new" element={<InvoiceFormPage />} />
          <Route path="invoices/:id" element={<InvoiceViewPage />} />
          <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />

          <Route path="quotes" element={<QuoteListPage />} />
          <Route path="quotes/new" element={<QuoteFormPage />} />
          <Route path="quotes/:id" element={<QuoteViewPage />} />
          <Route path="quotes/:id/edit" element={<QuoteFormPage />} />

          <Route path="payments" element={<PaymentListPage />} />
          <Route path="payments/new" element={<PaymentFormPage />} />

          <Route path="reports" element={<ReportsPage />} />

          <Route path="employees" element={<EmployeeListPage />} />
          <Route path="employees/new" element={<EmployeeFormPage />} />
          <Route path="employees/:id" element={<EmployeeViewPage />} />
          <Route path="employees/:id/edit" element={<EmployeeFormPage />} />

          <Route path="production-units" element={<ProductionUnitListPage />} />
          <Route path="production-units/new" element={<ProductionUnitFormPage />} />
          <Route path="production-units/:id/edit" element={<ProductionUnitFormPage />} />

          {/* Admin-only routes */}
          <Route path="tenants" element={<AdminRoute><TenantListPage /></AdminRoute>} />
          <Route path="tenants/new" element={<AdminRoute><TenantFormPage /></AdminRoute>} />
          <Route path="tenants/:id/edit" element={<AdminRoute><TenantFormPage /></AdminRoute>} />
          <Route path="users" element={<ManagerRoute><UserListPage /></ManagerRoute>} />
          <Route path="users/new" element={<ManagerRoute><UserFormPage /></ManagerRoute>} />
          <Route path="users/:id/edit" element={<ManagerRoute><UserFormPage /></ManagerRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
