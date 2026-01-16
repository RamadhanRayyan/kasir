
import React, { useState } from 'react';
/* Added missing X icon to imports */
import { Package, Plus, Search, Filter, Edit2, Trash2, ChevronRight, AlertTriangle, Box, X } from 'lucide-react';
import { Product, Category } from '../types';
import { supabase } from '../lib/supabaseClient';

interface InventoryProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
}


const Inventory: React.FC<InventoryProps> = ({ products, setProducts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({ name: '', category: Category.MAKANAN, price: 0, cost: 0, stock: 0, minStock: 5 });
  
  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [filterRestock, setFilterRestock] = useState(false);

  // Fetch products on mount (though App.tsx might be handling it, we should probably move fetching here or specific hooks, 
  // but for now we follow the pattern passed via props. 
  // However, the prompt asked to migrate features. If I modify this file to fetch, I should update App.tsx to NOT pass products maybe?
  // Let's stick to using the props if they are passed from App.tsx, BUT App.tsx needs to be updated to fetch from Supabase.
  // Wait, if I change App.tsx to fetch from Supabase, then "Inventory" just receives them.
  // But "Add Product" happens HERE. So I need to update "handleAddProduct".
  
  // Actually, the best approach is to let App.tsx handle the global state if many components share it (like POS), 
  // OR move state to React Query / SWR. 
  // Given the current structure, App.tsx holds the state. So I should probably update App.tsx to fetch data, 
  // and update Inventory.tsx to call a function passed from App.tsx (or update App.tsx to pass a "refresh" function).
  // BUT the instruction is "Migrate Inventory". I will allow Inventory to mutate data directly to Supabase, 
  // and then maybe trigger a refresh.
  // Let's import supabase here.
  

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    const matchesRestock = !filterRestock || p.stock <= p.minStock;
    return matchesSearch && matchesCategory && matchesRestock;
  });

  const handleAddOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const productPayload = {
      name: formData.name || 'Produk Baru',
      category: formData.category as Category,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      min_stock: Number(formData.minStock)
    };

    if (formData.id) {
        // Update Existing
        const { error } = await supabase
            .from('products')
            .update(productPayload)
            .eq('id', formData.id);

        if (error) {
            alert('Error updating product: ' + error.message);
        } else {
             // App.tsx uses realtime so no need to manual update setProducts if subscribed
             // But for responsiveness, we can update local state
             setProducts(products.map(p => p.id === formData.id ? { ...p, ...productPayload, minStock: productPayload.min_stock, id: formData.id! } : p));
             setIsAddModalOpen(false);
             resetForm();
        }
    } else {
        // Add New
        const { data, error } = await supabase
        .from('products')
        .insert([productPayload])
        .select();

        if (error) {
            alert('Error adding product: ' + error.message);
        } else if (data) {
            const mappedProduct: Product = {
                ...data[0],
                minStock: data[0].min_stock
            }
            setProducts([...products, mappedProduct]);
            setIsAddModalOpen(false);
            resetForm();
        }
    }
    
    setIsLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
      if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
        
      if (error) {
          alert('Error deleting product: ' + error.message);
      } else {
          setProducts(products.filter(p => p.id !== id));
      }
  }

  const openEditModal = (product: Product) => {
      setFormData(product);
      setIsAddModalOpen(true);
  }

  const resetForm = () => {
      setFormData({ name: '', category: Category.MAKANAN, price: 0, cost: 0, stock: 0, minStock: 5 });
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Stok Barang</h1>
          <p className="text-xs lg:text-sm text-slate-500">Kelola ketersediaan barang koperasi.</p>
        </div>
        <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg text-sm">
          <Plus size={20} /> Tambah Barang
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatItem icon={<Package size={20} />} color="blue" label="Total Varian" value={products.length} />
        <StatItem icon={<ChevronRight size={20} />} color="emerald" label="Total Unit" value={products.reduce((acc, p) => acc + p.stock, 0)} />
        <StatItem icon={<AlertTriangle size={20} />} color="red" label="Perlu Restock" value={products.filter(p => p.stock <= p.minStock).length} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-3 lg:p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari barang..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${isFilterOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>
        
        {/* Filter Options Panel */}
        {isFilterOpen && (
          <div className="p-3 lg:p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Kategori</label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as Category | 'All')}
              >
                <option value="All">Semua Kategori</option>
                {Object.values(Category).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1 flex flex-col justify-end">
               <label className="flex items-center gap-2 cursor-pointer select-none">
                 <input 
                   type="checkbox" 
                   checked={filterRestock}
                   onChange={(e) => setFilterRestock(e.target.checked)}
                   className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                 />
                 <span className="text-sm text-slate-700 font-medium">Hanya Perlu Restock</span>
               </label>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 lg:px-6 py-4">Barang</th>
                <th className="px-4 lg:px-6 py-4">Kategori</th>
                <th className="px-4 lg:px-6 py-4">Hrg Beli</th>
                <th className="px-4 lg:px-6 py-4">Hrg Jual</th>
                <th className="px-4 lg:px-6 py-4 text-center">Stok</th>
                <th className="px-4 lg:px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors text-xs lg:text-sm">
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><Box size={16} /></div>
                      <span className="font-semibold text-slate-800 line-clamp-1">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4"><span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full uppercase">{p.category}</span></td>
                  <td className="px-4 lg:px-6 py-4 text-slate-500">{formatCurrency(p.cost)}</td>
                  <td className="px-4 lg:px-6 py-4 text-emerald-700 font-semibold">{formatCurrency(p.price)}</td>
                  <td className="px-4 lg:px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-mono font-bold">{p.stock}</span>
                      {p.stock <= p.minStock && <span className="text-[8px] font-bold text-red-500 uppercase">Restock</span>}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <button onClick={() => openEditModal(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 lg:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900">{formData.id ? 'Edit Barang' : 'Barang Baru'}</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddOrUpdateProduct} className="p-5 lg:p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nama Produk</label>
                <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kategori</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})}>
                    {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Stok (Restock)</label>
                  <input required type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hrg Beli</label>
                  <input required type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hrg Jual</label>
                  <input required type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs">Batal</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-100">{formData.id ? 'Perbarui' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatItem: React.FC<{ icon: React.ReactNode, color: string, label: string, value: number }> = ({ icon, color, label, value }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className="bg-white p-3 lg:p-4 rounded-2xl border border-slate-200 flex items-center gap-3 lg:gap-4 shadow-sm">
      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] lg:text-xs font-medium text-slate-500">{label}</p>
        <p className="text-base lg:text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

export default Inventory;
