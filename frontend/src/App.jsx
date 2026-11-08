import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AllFilesPage from './pages/AllFilesPage';
import MyFilesPage from './pages/MyFilesPage';
import FavoritesPage from './pages/FavoritesPage';
import RecentsPage from './pages/RecentsPage';
import SharedWithMePage from './pages/SharedWithMePage';
import DeletedFilesPage from './pages/DeletedFilesPage';
import SettingsPage from './pages/SettingsPage';
import FolderDetailPage from './pages/FolderDetailPage';
import SharedLinkPage from './pages/SharedLinkPage';
import { Toaster } from 'sonner';

// Automatically routes Admin to /all-files and User to /my-files
function HomeRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/all-files' : '/my-files'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Non-disruptive, elevated bottom-right notification stack */}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          style: {
            borderRadius: '16px',
            fontSize: '13px',
            fontFamily: 'inherit',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Shared Link Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/shared-link/:token" element={<SharedLinkPage />} />

          {/* Protected Workspace Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Root smart redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* User Personal File System */}
            <Route path="/my-files" element={<MyFilesPage />} />
            <Route path="/folders/:folderName" element={<FolderDetailPage />} />
            <Route path="/shared" element={<SharedWithMePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/recents" element={<RecentsPage />} />
            <Route path="/trash" element={<DeletedFilesPage />} />

            {/* Admin-Exclusive Routes */}
            <Route
              path="/all-files"
              element={
                <AdminRoute>
                  <AllFilesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
