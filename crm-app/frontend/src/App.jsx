import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import RegisterCompany from './pages/RegisterCompany';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';
import Orders from './pages/Orders';
import OrderForm from './pages/OrderForm';
import Payments from './pages/Payments';
import PaymentForm from './pages/PaymentForm';
import MapPage from './pages/MapPage';
import Users from './pages/Users';
import Products from './pages/Products';
import DeleteRequests from './pages/DeleteRequests';
import Settings from './pages/Settings';

const queryClient = new QueryClient();
const routerBasename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || undefined;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterCompany />} />
            <Route path="/register-company" element={<RegisterCompany />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/new" element={<ProtectedRoute roles={['owner', 'staff']}><CustomerForm /></ProtectedRoute>} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="customers/:id/edit" element={<ProtectedRoute roles={['owner', 'staff']}><CustomerForm /></ProtectedRoute>} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/new" element={<ProtectedRoute roles={['owner', 'staff']}><OrderForm /></ProtectedRoute>} />
              <Route path="orders/:id/edit" element={<ProtectedRoute roles={['owner', 'staff']}><OrderForm /></ProtectedRoute>} />
              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<ProtectedRoute roles={['owner', 'staff']}><PaymentForm /></ProtectedRoute>} />
              <Route path="payments/:id/edit" element={<ProtectedRoute roles={['owner', 'staff']}><PaymentForm /></ProtectedRoute>} />
              <Route path="products" element={<ProtectedRoute roles={['owner', 'staff', 'viewer']}><Products /></ProtectedRoute>} />
              <Route path="map" element={<MapPage />} />
              <Route path="users" element={<ProtectedRoute roles={['owner']}><Users /></ProtectedRoute>} />
              <Route path="delete-requests" element={<ProtectedRoute roles={['owner']}><DeleteRequests /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute roles={['owner']}><Settings /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
