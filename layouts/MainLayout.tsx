
import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  History, 
  Settings as SettingsIcon, 
  Bell, 
  Menu, 
  LogOut, 
  MapPin,
  AlertTriangle,
  ChevronRight,
  X
} from 'lucide-react';
import { CooperativeAccount, Product } from '../types';

import { supabase } from '../lib/supabaseClient';

interface MainLayoutProps {
  activeAccount: CooperativeAccount;
  lowStockProducts: Product[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ activeAccount, lowStockProducts }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1280);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden no-print transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar - Integrated Responsive Design */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[70] transition-all duration-300 bg-emerald-900 text-white flex flex-col no-print
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
      `}>
        <div className="p-5 flex items-center justify-between h-16 shrink-0 border-b border-emerald-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-emerald-400 rounded-xl flex items-center justify-center font-black text-emerald-900 shrink-0 shadow-lg shadow-emerald-950/20">PK</div>
            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xl font-black tracking-tight whitespace-nowrap">POSKoe</span>}
          </div>
          <button className="lg:hidden p-1.5 hover:bg-emerald-800 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1.5 overflow-y-auto">
          <SidebarItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/pos" icon={<ShoppingCart size={20} />} label="Kasir (POS)" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/inventory" icon={<Package size={20} />} label="Inventaris" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/reports" icon={<BarChart3 size={20} />} label="Laporan" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/history" icon={<History size={20} />} label="Riwayat" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
        </nav>

        <div className="p-3 border-t border-emerald-800 space-y-1">
          <SidebarItem to="/settings" icon={<SettingsIcon size={20} />} label="Pengaturan" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <button 
            onClick={handleLogout}
            className={`flex items-center gap-4 px-3 py-2.5 w-full text-emerald-300 hover:text-white hover:bg-emerald-800 rounded-xl transition-all ${!isSidebarOpen && !isMobileMenuOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={20} />
            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-semibold">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 no-print shrink-0 z-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) setIsMobileMenuOpen(true);
                else setIsSidebarOpen(!isSidebarOpen);
              }}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 max-w-[200px] lg:max-w-[350px]">
              <MapPin size={14} className="text-emerald-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-emerald-500 uppercase leading-none">Lokasi Aktif</span>
                <span className="text-xs font-bold text-emerald-900 truncate">{activeAccount.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`p-2 rounded-xl transition-all relative ${isNotificationOpen ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <Bell size={20} />
                {lowStockProducts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-50 bg-slate-50/80 flex items-center justify-between">
                    <h4 className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wider">Peringatan Stok</h4>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-red-100 text-red-600 rounded-full">{lowStockProducts.length}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {lowStockProducts.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {lowStockProducts.map(p => (
                          <Link key={p.id} to="/inventory" onClick={() => setIsNotificationOpen(false)} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors group">
                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors"><AlertTriangle size={16} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-red-500 font-bold mt-0.5">Sisa stok: {p.stock}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 mt-1" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center text-xs font-medium text-slate-400 italic">Semua stok aman terjaga.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-100">
              <div className="text-right hidden md:block">
                <p className="text-xs font-black text-slate-900 uppercase">Administrator</p>
                <p className="text-[10px] text-emerald-600 font-black tracking-widest uppercase">Pusat</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-sm border-2 border-emerald-50">AD</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ to: string, icon: React.ReactNode, label: string, expanded: boolean, onClick?: () => void }> = ({ to, icon, label, expanded, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' 
          : 'text-emerald-100/80 hover:bg-emerald-800 hover:text-white'
      } ${!expanded ? 'justify-center' : ''}`}
    >
      <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'scale-105' : ''}`}>{icon}</span>
      {expanded && <span className="font-bold text-sm tracking-wide whitespace-nowrap">{label}</span>}
    </Link>
  );
};

export default MainLayout;
