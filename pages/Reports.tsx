
import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Calendar, Download } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Transaction, Product } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  transactions: Transaction[];
  products: Product[];
}

const Reports: React.FC<ReportsProps> = ({ transactions, products }) => {
  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Yearly');

  const stats = useMemo(() => {
    const now = new Date();
    // Reset time to end of day for inclusive comparison if needed, or just strict date checks
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    let filteredTransactions = transactions;

    // 1. Filter Transactions based on Period (Calendar Based)
    if (reportPeriod === 'Daily') {
      filteredTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getDate() === currentDate && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (reportPeriod === 'Weekly') {
      // Last 7 Days (Rolling week usually better for simple "Weekly" view unless strict Monday-Sunday requested)
      // User said "Harian Mingguan Bulanan Tahunan", usually implies "This Week" (Mon-Sun) or "Last 7 Days". 
      // Let's use "Last 7 Days" for Weekly but strict Calendar for Monthly/Yearly.
      const past = new Date(); 
      past.setDate(now.getDate() - 6); // Include today + 6 days back
      past.setHours(0,0,0,0);
      filteredTransactions = transactions.filter(t => new Date(t.date) >= past);
    } else if (reportPeriod === 'Monthly') {
      // Strict "This Month"
      filteredTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (reportPeriod === 'Yearly') {
      // Strict "This Year"
      filteredTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear;
      });
    }

    // 2. Calculate Totals
    const totalRevenue = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
    const totalItemsSold = filteredTransactions.reduce((acc, t) => acc + t.items.reduce((sum, i) => sum + i.quantity, 0), 0);
    // Round to nearest 100 to avoid "ugly" decimals or weird fractions like 71 rupiah
    const rawAvg = filteredTransactions.length ? totalRevenue / filteredTransactions.length : 0;
    const avgTransaction = Math.round(rawAvg / 100) * 100;
    
    // 3. Revenue by category for Pie Chart
    const categoryData: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        const cat = item.category || 'Uncategorized';
        categoryData[cat] = (categoryData[cat] || 0) + (item.price * item.quantity);
      });
    });

    const pieData = Object.keys(categoryData)
      .map(key => ({
        name: key,
        value: categoryData[key]
      }))
      .sort((a, b) => b.value - a.value);

    // 4. Revenue trend
    let trendData: { date: string, revenue: number }[] = [];

    if (reportPeriod === 'Yearly') {
      // Group by Month (Jan - Dec of This Year)
      const revenueByMonth: Record<string, number> = {};
      // Initialize all 12 months for consistent chart
      for(let i=0; i<12; i++) {
          const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
          revenueByMonth[key] = 0;
      }
      
      filteredTransactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if(revenueByMonth[key] !== undefined) revenueByMonth[key] += t.total;
      });

      trendData = Object.keys(revenueByMonth).sort().map(key => ({
        date: new Date(key + '-01').toLocaleDateString('id-ID', { month: 'short' }),
        revenue: revenueByMonth[key]
      }));

    } else if (reportPeriod === 'Daily') {
       // Group by Hour (00 - 23 or filtered range)
       const hourly: Record<string, number> = {};
       // Init hours relevant to operation hours or just all day
       for(let i=6; i<=22; i++) hourly[String(i).padStart(2,'0')] = 0;
       
       filteredTransactions.forEach(t => {
          const d = new Date(t.date);
          const h = String(d.getHours()).padStart(2, '0');
          if(hourly[h] !== undefined) hourly[h] += t.total;
       });

       trendData = Object.keys(hourly).sort().map(h => ({
          date: `${h}:00`,
          revenue: hourly[h]
       }));

    } else {
      // Group by Day (Weekly/Monthly)
      const revenueByDate: Record<string, number> = {};
      
      // Initialize dates based on period to ensure empty days show up
      if (reportPeriod === 'Monthly') {
          // Days is days in current month
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          for(let i=1; i<=daysInMonth; i++) {
              const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
              revenueByDate[key] = 0;
          }
      } else {
          // Weekly (Last 7 days)
          for(let i=6; i>=0; i--) {
              const d = new Date();
              d.setDate(now.getDate() - i);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              revenueByDate[key] = 0;
          }
      }

      filteredTransactions.forEach(t => {
        const d = new Date(t.date);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (revenueByDate[dateKey] !== undefined) revenueByDate[dateKey] += t.total;
      });

      trendData = Object.keys(revenueByDate).sort().map(dateStr => ({
          date: new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          revenue: revenueByDate[dateStr]
        }));
    }

    return { totalRevenue, totalItemsSold, avgTransaction, pieData, trendData };
  }, [transactions, reportPeriod]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("Laporan Koperasi POSKoe", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Laporan Keuangan & Stok", pageWidth / 2, 26, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(10, 32, pageWidth - 10, 32);

    // Meta Info
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Periode Laporan: ${reportPeriod}`, 14, 40);
    doc.text(`Tgl Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, pageWidth - 14, 40, { align: 'right' });

    // Summary Table
    autoTable(doc, {
      startY: 45,
      head: [['Ringkasan Performa', 'Nilai']],
      body: [
        ['Total Pendapatan', formatCurrency(stats.totalRevenue)],
        ['Total Unit Terjual', stats.totalItemsSold + ' Unit'],
        ['Rata-rata Transaksi', formatCurrency(stats.avgTransaction)],
        // ['Produk Terlaris', stats.pieData[0]?.name || '-']
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', width: 100 } },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    // Category Table
    doc.text("Rincian Kategori Produk", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Kategori', 'Pendapatan', 'Kontribusi (%)']],
      body: stats.pieData.map((d: any) => [
        d.name,
        formatCurrency(d.value),
        stats.totalRevenue > 0 ? ((d.value / stats.totalRevenue) * 100).toFixed(1) + '%' : '0%'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }, // Blue
    });

    // Trend Table
    doc.text(`Rincian Pendapatan (${reportPeriod})`, 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Tanggal / Waktu', 'Pendapatan']],
      body: stats.trendData.map((d: any) => [d.date, formatCurrency(d.revenue)]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }, // Orange
    });

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`Laporan_POSKoe_${reportPeriod}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analitik & Laporan</h1>
          <p className="text-slate-500">Analisa performa bisnis Koperasi Anda secara mendalam.</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as any)}
          >
            <option value="Daily">Hari Ini</option>
            <option value="Weekly">Minggu Ini</option>
            <option value="Monthly">Bulan Ini</option>
            <option value="Yearly">Tahunan</option>
          </select>
          <button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200">
            <Download size={16} />
            Ekspor PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Main Trend Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Tren Pendapatan</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `Rp${(val/1000000).toFixed(1)}jt`;
                      if (val >= 1000) return `Rp${(val/1000).toFixed(0)}rb`;
                      return `Rp${val}`;
                    }} 
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <DollarSign size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Pendapatan</p>
                <h2 className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</h2>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <ShoppingCart size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Rata-rata Transaksi</p>
                <h2 className="text-xl font-bold text-slate-900">{formatCurrency(stats.avgTransaction)}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Proporsi Kategori</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-64 w-full flex items-center justify-center">
              {stats.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400">
                  <p className="text-xs font-medium">Belum ada data transaksi</p>
                </div>
              )}
            </div>
            <div className="w-full mt-6 space-y-3">
              {stats.pieData.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats.totalRevenue > 0 ? ((d.value / stats.totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
