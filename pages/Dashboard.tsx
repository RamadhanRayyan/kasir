
import React, { useMemo } from 'react';
// Added missing Link import from react-router-dom
import { Link } from 'react-router-dom';
import { TrendingUp, Package, AlertCircle, ShoppingBag, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Product, Transaction } from '../types';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  lowStock: Product[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, transactions, lowStock }) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = transactions
      .filter(t => t.date.startsWith(today))
      .reduce((acc, curr) => acc + curr.total, 0);

    const totalRevenue = transactions.reduce((acc, curr) => acc + curr.total, 0);
    
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTotal = transactions
        .filter(t => t.date.startsWith(dateStr))
        .reduce((acc, curr) => acc + curr.total, 0);
      
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      return {
        name: days[date.getDay()],
        sales: dayTotal
      };
    }).reverse();

    return { todaySales, totalRevenue, dailyData };
  }, [transactions]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none">Ringkasan Bisnis</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 italic">Performa Koperasi hari ini terpantau stabil.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Sistem Online</span>
        </div>
      </div>

      {/* Grid Stats - Optimized for Tablet (2x2) and Desktop (4x1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          title="Omzet Hari Ini" 
          value={formatCurrency(stats.todaySales)} 
          icon={<TrendingUp size={22} />} 
          color="emerald"
        />
        <StatCard 
          title="Varian Produk" 
          value={products.length.toString()} 
          icon={<Package size={22} />} 
          color="blue"
        />
        <StatCard 
          title="Total Transaksi" 
          value={transactions.length.toString()} 
          icon={<ShoppingBag size={22} />} 
          color="purple"
        />
        <StatCard 
          title="Restock Dibutuhkan" 
          value={lowStock.length.toString()} 
          icon={<AlertCircle size={22} />} 
          color={lowStock.length > 0 ? "red" : "slate"}
          isCritical={lowStock.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="xl:col-span-2 bg-white p-5 lg:p-7 rounded-[32px] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Tren Penjualan Mingguan</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">Pendapatan</div>
            </div>
          </div>
          <div className="h-64 lg:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 10}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '12px'}}
                />
                <Bar dataKey="sales" radius={[8, 8, 8, 8]} barSize={24}>
                  {stats.dailyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === stats.dailyData.length - 1 ? '#059669' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock List */}
        <div className="bg-white p-5 lg:p-7 rounded-[32px] shadow-sm border border-slate-100 flex flex-col h-full max-h-[500px] xl:max-h-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Peringatan Stok</h3>
            <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[10px] font-black">{lowStock.length} ITEM</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {lowStock.length > 0 ? (
              lowStock.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 font-black text-xs shrink-0 group-hover:border-emerald-200 transition-colors">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-red-600 font-black">SISA: {p.stock}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{p.category}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0 group-hover:text-emerald-500 transition-colors" />
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-[24px] flex items-center justify-center mb-4">
                  <Package size={32} />
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Semua Stok<br/>Tersedia Aman</p>
              </div>
            )}
          </div>
          {lowStock.length > 0 && (
            <Link to="/inventory" className="mt-6 w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-slate-200 transition-colors">
              Buka Inventaris
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string, isCritical?: boolean }> = ({ 
  title, value, icon, color, isCritical 
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600 border-emerald-50',
    blue: 'bg-blue-100 text-blue-600 border-blue-50',
    purple: 'bg-purple-100 text-purple-600 border-purple-50',
    red: 'bg-red-100 text-red-600 border-red-50',
    slate: 'bg-slate-100 text-slate-400 border-slate-50'
  };

  return (
    <div className={`p-4 lg:p-6 rounded-[28px] bg-white border ${isCritical ? 'border-red-200 shadow-md shadow-red-50' : 'border-slate-100'} shadow-sm flex flex-col justify-between transition-all hover:shadow-md h-fit`}>
      <div className="flex items-start justify-between mb-4 lg:mb-6">
        <p className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <div className={`p-2 lg:p-3 rounded-2xl ${colorMap[color]} shrink-0 shadow-inner`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <h2 className="text-lg lg:text-2xl font-black text-slate-900 leading-none truncate tracking-tight">{value}</h2>
      </div>
    </div>
  );
};

export default Dashboard;
