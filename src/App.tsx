import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { SummaryPage } from './pages/SummaryPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { ReimbursementPage } from './pages/ReimbursementPage';
import { ConfigPage } from './pages/ConfigPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<OverviewPage />} />
                <Route path="/dashboard/whatsapp" element={<WhatsAppPage />} />
                <Route path="/dashboard/whatsapp/summary" element={<SummaryPage />} />
                <Route path="/dashboard/whatsapp/reimbursement" element={<ReimbursementPage />} />
                <Route path="/dashboard/config" element={<ConfigPage />} />
                
                {/* Legacy redirect */}
                <Route path="/dashboard/whatsapp/chats" element={<Navigate to="/dashboard/whatsapp/summary" replace />} />
                <Route path="/dashboard/whatsapp/chats/:id" element={<Navigate to="/dashboard/whatsapp/summary" replace />} />
                <Route path="/dashboard/whatsapp/todo" element={<Navigate to="/dashboard/whatsapp/summary" replace />} />

                {/* Administration */}
                <Route
                  path="/dashboard/users"
                  element={<ProtectedRoute requiredPermission="user.view" />}
                >
                  <Route index element={<UsersPage />} />
                </Route>

                <Route
                  path="/dashboard/roles"
                  element={<ProtectedRoute requiredPermission="role.view" />}
                >
                  <Route index element={<RolesPage />} />
                </Route>

                <Route
                  path="/dashboard/permissions"
                  element={<ProtectedRoute requiredPermission="permission.view" />}
                >
                  <Route index element={<PermissionsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
