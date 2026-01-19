
import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Download, CheckCircle2, Box, ChevronDown, LayoutGrid } from 'lucide-react';
import jsPDF from 'jspdf';
import { Product, CartItem, Transaction, Category, CooperativeAccount } from '../types';

interface POSProps {
  products: Product[];
  onCompleteTransaction: (transaction: Transaction) => void;
  activeAccount: CooperativeAccount;
}

const POS: React.FC<POSProps> = ({ products, onCompleteTransaction, activeAccount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [isMobileCartVisible, setIsMobileCartVisible] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty > item.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal;

  const handleCheckout = (method: Transaction['paymentMethod']) => {
    if (cart.length === 0) return;
    const newTransaction: Transaction = {
      id: `TRX-${Date.now()}`,
      items: [...cart],
      total,
      paymentMethod: method,
      date: new Date().toISOString()
    };
    onCompleteTransaction(newTransaction);
    setLastTransaction(newTransaction);
    setCart([]);
    setIsSuccessModalOpen(true);
    setIsMobileCartVisible(false);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleExportReceipt = () => {
    if (!lastTransaction) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Design Configuration
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);
    const primaryColor = [16, 185, 129]; // Emerald-600 RGB
    const grayColor = [100, 116, 139]; // Slate-500
    const lightGray = [226, 232, 240]; // Slate-200

    // Helper functions
    const centerText = (text: string, y: number, fontSize: number = 10, isBold: boolean = false, color: number[] = [0,0,0]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text, pageWidth / 2, y, { align: 'center' });
    };

    const drawLine = (y: number) => {
      doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
    };

    let yPos = 10;

    // --- HEADER ---
    // Logo placeholder / Brand Name
    doc.setFillColor(236, 253, 245); // Emerald-50 background
    doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
    
    yPos += 8;
    centerText("KOPERASI", yPos, 14, true, primaryColor);
    yPos += 5;
    centerText("Digital Payment Receipt", yPos, 8, false, grayColor);
    yPos += 15;

    // --- TRANSACTION DETAILS ---
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    // Order ID & Date Row
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Order ID", margin, yPos);
    doc.text("Tanggal", pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(lastTransaction.id, margin, yPos);
    const dateStr = new Date(lastTransaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit'});
    const timeStr = new Date(lastTransaction.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
    doc.text(`${dateStr}, ${timeStr}`, pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 8;

    // Cashier
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Kasir", margin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(activeAccount?.name || 'Admin', pageWidth - margin, yPos, { align: 'right' });

    yPos += 6;
    drawLine(yPos);
    yPos += 6;

    // --- ITEMS LIST ---
    lastTransaction.items.forEach(item => {
      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(item.name, margin, yPos);
      yPos += 4;
      
      // Detail
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`${item.quantity} x ${formatCurrency(item.price)}`, margin, yPos);
      
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(item.quantity * item.price), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos -= 2;
    drawLine(yPos);
    yPos += 6;

    // --- TOTALS SECTION ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); // Emerald-600
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
    
    let totalY = yPos + 6;
    doc.setTextColor(255, 255, 255); // White text
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Total Pembayaran", margin + 3, totalY);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(lastTransaction.total), pageWidth - margin - 3, totalY + 6, { align: 'right' });
    
    doc.setFontSize(8);
    doc.text(lastTransaction.paymentMethod, margin + 3, totalY + 6);

    yPos += 25;

    // --- FOOTER ---
    centerText("Terima Kasih", yPos, 10, true, primaryColor);
    yPos += 5;
    centerText("Simpan struk ini sebagai bukti pembayaran yang sah.", yPos, 7, false, grayColor);

    // Save
    doc.save(`Receipt_${lastTransaction.id}.pdf`);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-8 relative max-w-[1800px] mx-auto">
      {/* Product List Section & Cart - Hide on Print */}
      <div className="contents">
          <div className="flex-1 flex flex-col gap-4 lg:gap-5 overflow-hidden">
            {/* Responsive Filter Header */}
            <div className="bg-white p-3 sm:p-4 rounded-4xl sm:rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-3 shadow-sm shadow-slate-100/50 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari Produk..." 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-[13px] font-semibold transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 md:flex-none px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer"
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value as any)}
                >
                  <option value="All">Semua Kategori</option>
                  {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="hidden sm:block">
                   <button className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100"><LayoutGrid size={20} /></button>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 pb-32 lg:pb-6 pr-1 items-start content-start">
              {filteredProducts.map(product => (
                <button 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`group flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 text-left p-3.5 h-auto ${product.stock <= 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/50 group-hover:scale-110 transition-transform">
                      <Box size={16} />
                    </div>
                    {product.stock <= product.minStock && (
                      <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">LOW</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    {product.sku && <p className="text-[8px] font-mono font-bold text-slate-400 mb-0.5">{product.sku}</p>}
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1 tracking-widest opacity-80">{product.category}</p>
                    <h4 className="text-[12px] lg:text-[13px] font-black text-slate-800 line-clamp-2 leading-tight mb-4 min-h-10 group-hover:text-emerald-700 transition-colors">{product.name}</h4>
                    <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-[13px] lg:text-[14px] font-black text-emerald-700 tracking-tight">{formatCurrency(product.price).replace('Rp', 'Rp ')}</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <p className="text-[10px] text-slate-400 font-black uppercase">Stk: {product.stock}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Search size={32} className="text-slate-200" />
                  </div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Produk tidak ditemukan</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Drawer & Sidebar - Optimized for Tablet */}
            <div className={`
            fixed lg:static inset-x-0 bottom-0 z-50 bg-white lg:bg-white border-t lg:border border-slate-200 lg:rounded-[40px] shadow-2xl lg:shadow-xl lg:shadow-slate-200/50 flex flex-col overflow-hidden transition-all duration-500 ease-out
            ${isMobileCartVisible ? 'h-[85vh] translate-y-0 rounded-t-[40px]' : 'h-0 translate-y-1/2 lg:h-full lg:translate-y-0 lg:w-80 xl:w-[400px]'}
          `}>
            <div className="p-5 sm:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-black text-slate-800 flex items-center gap-3 text-sm xl:text-base uppercase tracking-widest">
                <ShoppingCart size={20} className="text-emerald-600" />
                Keranjang <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{cart.reduce((a,b)=>a+b.quantity, 0)}</span>
              </h3>
              <div className="flex items-center gap-4">
                <button onClick={() => setCart([])} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:text-red-600 transition-colors">Clear</button>
                <button className="lg:hidden p-2 bg-slate-100 text-slate-400 rounded-2xl" onClick={() => setIsMobileCartVisible(false)}><ChevronDown size={24} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-emerald-50 rounded-[40px] flex items-center justify-center text-emerald-200 mb-6">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest max-w-[150px] leading-relaxed">Belum ada item yang dipilih</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-[28px] border border-slate-100 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-slate-800 truncate leading-tight group-hover:text-emerald-700 transition-colors">{item.name}</p>
                      <p className="text[11px] text-emerald-600 font-black mt-1 tracking-tight">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><Minus size={14} /></button>
                      <span className="text-[13px] font-black w-5 text-center text-slate-700">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50 space-y-5 rounded-b-[40px]">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-4 border-t border-dashed border-slate-200">
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Bayar</span>
                <span className="text-2xl font-black text-emerald-700 tracking-tight">{formatCurrency(total)}</span>
              </div>
              <button 
                onClick={() => handleCheckout('Cash')}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white rounded-[24px] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 font-black uppercase text-[12px] tracking-widest disabled:opacity-40 disabled:shadow-none active:scale-95"
              >
                <Banknote size={20} />
                Selesaikan Pembayaran
              </button>
            </div>
          </div>

          {/* Floating Cart Button (Tablet/Mobile Only) */}
          {!isMobileCartVisible && (
            <button 
              onClick={() => setIsMobileCartVisible(true)}
              className="lg:hidden fixed bottom-8 right-8 z-50 w-16 h-16 bg-emerald-600 text-white rounded-[32px] shadow-2xl flex items-center justify-center animate-bounce shadow-emerald-400/30"
            >
              <ShoppingCart size={28} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white">
                  {cart.reduce((a,b)=>a+b.quantity, 0)}
                </span>
              )}
            </button>
          )}

          {/* Success Modal - Screen Only */}
          {isSuccessModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
              <div className="bg-white rounded-[48px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 border border-white/20">
                <div className="bg-emerald-600 p-8 text-center text-white relative">
                  <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center mx-auto mb-5 border border-white/30 backdrop-blur-sm">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-2xl font-black mb-1 uppercase tracking-tight">Sukses!</h2>
                  <p className="text-emerald-100 text-[10px] uppercase font-black tracking-[0.2em] opacity-80">{lastTransaction?.id}</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {lastTransaction?.items.map(item => (
                      <div key={item.id} className="flex justify-between text-[11px] font-bold border-b border-slate-50 pb-2 last:border-0">
                        <span className="text-slate-500">{item.quantity}x {item.name}</span>
                        <span className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-5 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-emerald-700 tracking-tight">{formatCurrency(lastTransaction?.total || 0)}</span>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={handleExportReceipt} className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                      <Download size={18} />Ekspor PDF
                    </button>
                    <button onClick={() => setIsSuccessModalOpen(false)} className="flex-1 py-4 bg-emerald-600 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95">
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default POS;
