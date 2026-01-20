-- ==================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR POSKOE
-- ==================================================
-- Jalankan script ini di Supabase Dashboard -> SQL Editor
-- Tujuan: Mengamankan database agar hanya user yang login 
--         yang dapat mengakses dan memodifikasi data
-- ==================================================

-- ==================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- STEP 2: POLICIES FOR 'accounts' TABLE
-- ==================================================

CREATE POLICY "Authenticated users can read accounts"
ON accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update accounts"
ON accounts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete accounts"
ON accounts FOR DELETE
TO authenticated
USING (true);

-- ==================================================
-- STEP 3: POLICIES FOR 'products' TABLE
-- ==================================================

CREATE POLICY "Authenticated users can read products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
ON products FOR DELETE
TO authenticated
USING (true);

-- ==================================================
-- STEP 4: POLICIES FOR 'transactions' TABLE
-- ==================================================

CREATE POLICY "Authenticated users can read transactions"
ON transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
ON transactions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transactions"
ON transactions FOR DELETE
TO authenticated
USING (true);

-- ==================================================
-- STEP 5: POLICIES FOR 'transaction_items' TABLE
-- ==================================================

CREATE POLICY "Authenticated users can read transaction_items"
ON transaction_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transaction_items"
ON transaction_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transaction_items"
ON transaction_items FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transaction_items"
ON transaction_items FOR DELETE
TO authenticated
USING (true);

-- ==================================================
-- DONE! 
-- ==================================================
-- Setelah menjalankan script ini:
-- 1. User yang TIDAK login tidak bisa akses data
-- 2. User yang SUDAH login bisa akses semua data
-- ==================================================
