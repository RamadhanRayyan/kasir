
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import KasirLayout from './layouts/KasirLayout';
import { Product, Transaction, CooperativeAccount, UserRole } from './types';
import { INITIAL_PRODUCTS, INITIAL_ACCOUNTS } from './constants';

import { supabase } from './lib/supabaseClient';

const RequireAuth = ({ children, onAuthFetch }: { children: React.ReactElement, onAuthFetch: (role: UserRole, branchId?: string) => void }) => {
  const [session, setSession] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(!!session);
      if (session?.user) {
        const role = session.user.user_metadata?.role as UserRole || UserRole.SUPER_ADMIN; 
        const branchId = session.user.user_metadata?.branch_id;
        onAuthFetch(role, branchId);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(!!session);
      if (session?.user) {
        const role = session.user.user_metadata?.role as UserRole || UserRole.SUPER_ADMIN;
        const branchId = session.user.user_metadata?.branch_id;
        onAuthFetch(role, branchId);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthFetch]);

  if (session === null) {
    return <div className="h-screen w-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<CooperativeAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const [metadataBranchId, setMetadataBranchId] = useState<string | undefined>();

  // 1. Fetch Accounts (Branches) on Mount
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: true });
      
      if (data && data.length > 0) {
        setAccounts(data);
        
        // Priority: Metadata > Local Storage > First item
        if (metadataBranchId && data.find(a => a.id === metadataBranchId)) {
            setActiveAccountId(metadataBranchId);
        } else {
            const savedId = localStorage.getItem('toko_amanah_active_account_id');
            if (savedId && data.find(a => a.id === savedId)) {
                setActiveAccountId(savedId);
            } else if (data.length > 0) {
                setActiveAccountId(data[0].id);
            }
        }
      } else {
        // Init default account if none exists (First Run)
        const defaultAccount = { name: 'Toko Amanah', address: 'Pusat', phone: '-' };
        const { data: newData } = await supabase.from('accounts').insert([defaultAccount]).select().single();
        if (newData) {
            setAccounts([newData]);
            setActiveAccountId(newData.id);
        }
      }
      setIsLoading(false);
    };
    
    fetchAccounts();
  }, [metadataBranchId]);

  // 1b. Reactive Branch Selection (Crucial for login redirect)
  useEffect(() => {
    if (metadataBranchId && accounts.length > 0) {
      const targetAccount = accounts.find(a => a.id === metadataBranchId);
      if (targetAccount) {
        console.log('Reactively switching to branch from metadata:', targetAccount.name);
        setActiveAccountId(metadataBranchId);
      }
    }
  }, [metadataBranchId, accounts]);

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Persist Active Account Change
  useEffect(() => {
    if (activeAccountId) {
        localStorage.setItem('toko_amanah_active_account_id', activeAccountId);
    }
  }, [activeAccountId]);

  // 2. Fetch Products filtered by Active Branch
  useEffect(() => {
    if (!activeAccountId) return;
    
    let isActive = true;

    // CLEAR STATE immediately to prevent showing old branch data during loading
    setProducts([]); 
    
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('branch_id', activeAccountId); // Filter by Branch
      
      if (error) {
        console.error('Error fetching products:', error);
      } else if (data && isActive) {
        // Map keys matches DB columns
        const mappedProducts: Product[] = data.map((p: any) => ({
          ...p,
          branch_id: p.branch_id, // include branch_id
          sku: p.sku, // include SKU
          minStock: p.min_stock
        }));
        setProducts(mappedProducts);
      }
    };
    
    fetchProducts();
    
    // Subscribe to changes for this branch
    const channel = supabase
      .channel(`products_realtime`)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products'
        }, 
        (payload) => {
          if (isActive) {
            console.log('Product change received:', payload);
            const p = payload.new as any || payload.old as any;
            
            // Branch filtering
            if (p && (p.branch_id === activeAccountId)) {
              if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                const mappedP: Product = {
                  ...payload.new as any,
                  sku: (payload.new as any).sku,
                  minStock: (payload.new as any).min_stock
                };
                setProducts(current => {
                  const exists = current.find(item => item.id === mappedP.id);
                  if (exists) {
                    return current.map(item => item.id === mappedP.id ? mappedP : item);
                  } else {
                    return [...current, mappedP];
                  }
                });
              } else if (payload.eventType === 'DELETE') {
                setProducts(current => current.filter(item => item.id !== payload.old.id));
              } else {
                fetchProducts();
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Product subscription status for ${activeAccountId}:`, status);
      });
    
    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    }
  }, [activeAccountId]);


  // 3. Fetch Transactions filtered by Active Branch
  useEffect(() => {
     if (!activeAccountId) return;

     let isActive = true;

     // CLEAR STATE immediately
     setTransactions([]);
     
     const fetchTransactions = async () => {
      if (!isActive) return;

      const { data, error } = await supabase
         .from('transactions')
        .select(`
          *,
          items:transaction_items(
            *,
            product:products(name, category, min_stock, stock)
          )
        `)
        .eq('branch_id', activeAccountId) // Filter by Branch
        .order('date', { ascending: false });

      if (!isActive) return;

      if (error) {
        console.error('Error fetching transactions:', error);
      } else if (data) {
        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t.id,
          branch_id: t.branch_id, // include branch_id
          date: t.date,
          total: t.total,
          paymentMethod: t.payment_method,
          items: t.items.map((i: any) => ({
             id: i.product_id,
             quantity: i.quantity,
             price: i.price_at_sale,
             cost: i.cost_at_sale,
             name: i.product?.name || 'Unknown Product',
             category: i.product?.category || 'Uncategorized',
             stock: i.product?.stock || 0,
             minStock: i.product?.min_stock || 0
          }))
        }));
        
        setTransactions(mappedTransactions);
      }
    };
    
    fetchTransactions();

    // Subscribe to transactions for this branch
    const channel = supabase
      .channel(`transactions_realtime`)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions'
        }, 
        (payload) => {
          if (isActive) {
            console.log('Transaction change received:', payload);
            const t = payload.new as any || payload.old as any;
            if (t && (!t.branch_id || t.branch_id === activeAccountId)) {
              fetchTransactions();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Transaction subscription status for ${activeAccountId}:`, status);
      });

    return () => {
        isActive = false;
        supabase.removeChannel(channel);
    }
  }, [activeAccountId]);

  const addTransaction = async (transaction: Transaction) => {
    if (!activeAccountId) return;

    // 1. Insert Transaction with branch_id
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .insert([{
        branch_id: activeAccountId, // Tag with Branch
        total: transaction.total,
        payment_method: transaction.paymentMethod,
        date: transaction.date,
        profile_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (transError || !transData) {
      alert('Transaction failed: ' + transError?.message);
      return;
    }

    // 2. Insert Items
    const itemsToInsert = transaction.items.map(item => ({
      transaction_id: transData.id,
      product_id: item.id,
      quantity: item.quantity,
      price_at_sale: item.price,
      cost_at_sale: item.cost
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Failed to save items', itemsError);
    }

    // 3. Update Stock (One by one)
    for (const item of transaction.items) {
      const currentProduct = products.find(p => p.id === item.id);
      if (currentProduct) {
        const newStock = currentProduct.stock - item.quantity;
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);
      }
    }
    
    // 4. Optimistic Update (Transactions only - safe from race conditions as it's an append)
    setTransactions(prev => [{
      ...transaction,
      id: transData.id,
      date: transData.date
    }, ...prev]);
    
    // We REMOVED optimistic setProducts here to prevent over-subtraction bugs.
    // The Realtime listener above will handle stock updates automatically 
    // and more accurately as they happen in Supabase.
  };

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0] || { name: '', address: '', phone: '', id: '' };
  }, [accounts, activeAccountId]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Memuat aplikasi...</p>
      </div>
    </div>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={
          <RequireAuth onAuthFetch={(role, branchId) => {
            setUserRole(role);
            if (branchId) setMetadataBranchId(branchId);
          }}>
            {userRole === UserRole.SUPER_ADMIN ? (
              <MainLayout 
                activeAccount={activeAccount} 
                lowStockProducts={lowStockProducts}
                accounts={accounts}
                activeAccountId={activeAccountId}
                setActiveAccountId={setActiveAccountId}
              />
            ) : (
              <KasirLayout 
                activeAccount={activeAccount} 
                lowStockProducts={lowStockProducts}
              />
            )}
          </RequireAuth>
        }>
          <Route path="/" element={userRole === UserRole.SUPER_ADMIN ? <Dashboard products={products} transactions={transactions} lowStock={lowStockProducts} accounts={accounts} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId} /> : <Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POS products={products} onCompleteTransaction={addTransaction} activeAccount={activeAccount} />} />
          <Route path="/inventory" element={<Inventory products={products} setProducts={setProducts} activeAccountId={activeAccountId} activeAccountName={activeAccount.name} />} />
          <Route path="/reports" element={userRole === UserRole.SUPER_ADMIN ? <Reports transactions={transactions} products={products} /> : <Navigate to="/pos" replace />} />
          <Route path="/history" element={<HistoryPage transactions={transactions} />} />
          <Route path="/settings" element={userRole === UserRole.SUPER_ADMIN ? <SettingsPage accounts={accounts} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId} setAccounts={setAccounts} /> : <Navigate to="/pos" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
