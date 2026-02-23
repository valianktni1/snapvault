import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Plus, LogOut, Menu, X } from 'lucide-react';

import { Shield } from 'lucide-react';

const getNavItems = (isAdmin) => [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/events/create', label: 'Create Event', icon: Plus },
  ...(isAdmin ? [{ path: '/admin', label: 'Admin Panel', icon: Shield }] : []),
];

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const adminUser = user?.role === 'admin';
  const navItems = getNavItems(adminUser);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <img
            src="/snapvault-logo.png"
            alt="SnapVault Events"
            className="h-10 w-10 object-contain rounded-xl flex-shrink-0"
          />
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">SnapVault</p>
            <p className="text-xs text-slate-400">Events Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children, title }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col flex-shrink-0 shadow-sm">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white flex flex-col shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
        </header>

        <main className="flex-1 overflow-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
