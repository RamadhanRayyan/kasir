
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
import { Product, Transaction, CooperativeAccount } from './types';
import { INITIAL_PRODUCTS, INITIAL_ACCOUNTS } from './constants';

import { supabase } from './lib/supabaseClient';

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === null) {
    return <div className="h-screen w-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<CooperativeAccount[]>(() => {
    const saved = localStorage.getItem('poskoe_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    return localStorage.getItem('poskoe_active_account_id') || INITIAL_ACCOUNTS[0].id;
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    localStorage.setItem('poskoe_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('poskoe_active_account_id', activeAccountId);
  }, [activeAccountId]);

  useEffect(() => {
    localStorage.setItem('poskoe_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('poskoe_active_account_id', activeAccountId);
  }, [activeAccountId]);

  // Fetch Products from Supabase on Mount or Account Change
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) {
        console.error('Error fetching products:', error);
      } else if (data) {
        // Map data to match Product interface if needed (e.g. snake_case to camelCase)
        // Schema: min_stock -> Product: minStock
        const mappedProducts: Product[] = data.map((p: any) => ({
          ...p,
          minStock: p.min_stock
        }));
        setProducts(mappedProducts);
      }
    };
    
    fetchProducts();
    
    // Subscribe to changes for realtime updates
    const channel = supabase
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        fetchProducts(); // Simple re-fetch on change
    })
    .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    }
  }, [activeAccountId]);


  // Fetch Transactions
  useEffect(() => {
     const fetchTransactions = async () => {
      const { data, error } = await supabase
         .from('transactions')
        .select(`
          *,
          items:transaction_items(
            *,
            product:products(name, category, min_stock, stock)
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else if (data) {
        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t.id,
          date: t.date,
          total: t.total,
          paymentMethod: t.payment_method,
          items: t.items.map((i: any) => ({
             id: i.product_id,
             quantity: i.quantity,
             price: i.price_at_sale,
             cost: i.cost_at_sale,
             // Map from joined product data
             name: i.product?.name || 'Unknown Product',
             category: i.product?.category || 'Uncategorized',
             stock: i.product?.stock || 0,
             minStock: i.product?.min_stock || 0
          }))
        }));
        
        setTransactions(mappedTransactions);
      }
    };
    
    // run only if we have products? No, independent.
    fetchTransactions();
  }, [activeAccountId]); // re-fetch on account change

  const addTransaction = async (transaction: Transaction) => {
    // 1. Insert Transaction
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .insert([{
        total: transaction.total,
        payment_method: transaction.paymentMethod,
        date: transaction.date, // ensure ISO string
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

    // 3. Update Stock (One by one for now)
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
    
    // 4. Update Local State (Optimistic or Refetch)
    // We rely on realtime subscription or just manual update
    setTransactions(prev => [transaction, ...prev]);
    setProducts(prev => prev.map(p => {
      const soldItem = transaction.items.find(item => item.id === p.id);
      if (soldItem) return { ...p, stock: p.stock - soldItem.quantity };
      return p;
    }));
  };

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0];
  }, [accounts, activeAccountId]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={
          <RequireAuth>
            <MainLayout 
              activeAccount={activeAccount} 
              lowStockProducts={lowStockProducts}
            />
          </RequireAuth>
        }>
          <Route path="/" element={<Dashboard products={products} transactions={transactions} lowStock={lowStockProducts} />} />
          <Route path="/pos" element={<POS products={products} onCompleteTransaction={addTransaction} activeAccount={activeAccount} />} />
          <Route path="/inventory" element={<Inventory products={products} setProducts={setProducts} />} />
          <Route path="/reports" element={<Reports transactions={transactions} products={products} />} />
          <Route path="/history" element={<HistoryPage transactions={transactions} />} />
          <Route path="/settings" element={<SettingsPage accounts={accounts} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId} setAccounts={setAccounts} />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
