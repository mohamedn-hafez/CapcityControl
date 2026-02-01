import React, { useState } from 'react';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Header } from './src/components/Header';
import { MonthSelector } from './src/components/MonthSelector';
import { CapacityGrid } from './src/components/CapacityGrid';
import { ClosurePanel } from './src/components/ClosurePanel';
import { AllocationPanel } from './src/components/AllocationPanel';
import { AdminPanel } from './src/components/AdminPanel';
import { LoginPage } from './src/components/LoginPage';

type PageView = 'dashboard' | 'admin';

function Dashboard({ onNavigate }: { onNavigate: (page: PageView) => void }) {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <Header onAdmin={() => onNavigate('admin')} />

      {/* Month Selector */}
      <MonthSelector />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left Panel - Closures */}
          <div className="col-span-3">
            <ClosurePanel />
          </div>

          {/* Center - Capacity Grid */}
          <div className="col-span-5">
            <CapacityGrid />
          </div>

          {/* Right Panel - Allocations */}
          <div className="col-span-4">
            <AllocationPanel />
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {state.error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {state.error}
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (currentPage === 'admin') {
    return <AdminPanel onBack={() => setCurrentPage('dashboard')} />;
  }

  return <Dashboard onNavigate={setCurrentPage} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
