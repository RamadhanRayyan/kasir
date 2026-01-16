
import React, { useState } from 'react';
import { Building2, Save, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import { CooperativeAccount } from '../types';

interface SettingsProps {
  accounts: CooperativeAccount[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  setAccounts: (accounts: CooperativeAccount[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ accounts, activeAccountId, setActiveAccountId, setAccounts }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CooperativeAccount>>({});

  const startEditing = (account: CooperativeAccount) => {
    setEditingId(account.id);
    setFormData(account);
  };

  const handleSave = () => {
    if (!editingId) return;
    const newAccounts = accounts.map(a => a.id === editingId ? { ...a, ...formData } as CooperativeAccount : a);
    setAccounts(newAccounts);
    setEditingId(null);
  };

  const addNewAccount = () => {
    const newAccount: CooperativeAccount = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Cabang Baru',
      address: 'Alamat Cabang',
      phone: '021-xxxxxx'
    };
    setAccounts([...accounts, newAccount]);
    startEditing(newAccount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Sistem</h1>
        <p className="text-slate-500">Kelola identitas koperasi dan konfigurasi aplikasi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="font-bold text-slate-800 mb-2">Akun Koperasi</h3>
          <p className="text-sm text-slate-500">Pilih akun yang sedang aktif atau tambahkan cabang baru jika Koperasi Anda memiliki lebih dari satu lokasi.</p>
        </div>

        <div className="md:col-span-2 space-y-4">
          {accounts.map(account => (
            <div 
              key={account.id} 
              className={`p-5 rounded-2xl border transition-all ${
                activeAccountId === account.id 
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-100' 
                  : 'bg-white border-slate-200'
              }`}
            >
              {editingId === account.id ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nama Koperasi</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Alamat</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSave}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm"
                    >
                      <Save size={16} /> Simpan
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      activeAccountId === account.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{account.name}</h4>
                      <p className="text-sm text-slate-500">{account.address}</p>
                      <p className="text-xs text-slate-400 mt-1">{account.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {activeAccountId !== account.id ? (
                      <button 
                        onClick={() => setActiveAccountId(account.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200"
                      >
                        <Check size={14} /> Gunakan Akun
                      </button>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded text-center">Aktif</span>
                    )}
                    <button 
                      onClick={() => startEditing(account)}
                      className="text-slate-400 hover:text-emerald-600 text-xs font-medium text-center"
                    >
                      Edit Info
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button 
            onClick={addNewAccount}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-all"
          >
            <Plus size={20} />
            Tambah Cabang Baru
          </button>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="font-bold text-slate-800 mb-2">Pemeliharaan Data</h3>
          <p className="text-sm text-slate-500">Opsi untuk mengosongkan data atau sinkronisasi ulang.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-red-800">Reset Seluruh Data</p>
              <p className="text-sm text-red-600">Menghapus semua produk dan riwayat transaksi secara permanen.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200">
              Reset Data
            </button>
          </div>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Sinkronisasi Awan</p>
              <p className="text-sm text-slate-500">Sinkronkan data dengan server pusat koperasi.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">
              <RefreshCw size={16} /> Mulai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
