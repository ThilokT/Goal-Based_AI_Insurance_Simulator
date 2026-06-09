-- ============================================================
-- LifeMap — Initial Database Schema
-- Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. PROFILES — User profile data (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 100),
    annual_income NUMERIC(15, 2),
    monthly_expenses NUMERIC(12, 2),
    existing_coverage NUMERIC(15, 2) DEFAULT 0,
    dependents INTEGER DEFAULT 0,
    risk_appetite TEXT CHECK (risk_appetite IN ('conservative', 'moderate', 'aggressive')),
    city TEXT,
    marital_status TEXT,
    occupation TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PRODUCTS — Insurance products from scraper
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    min_age INTEGER,
    max_age INTEGER,
    policy_term_min INTEGER,
    policy_term_max INTEGER,
    key_benefits JSONB DEFAULT '[]',
    goals_supported JSONB DEFAULT '[]',
    eligibility JSONB DEFAULT '{}',
    features JSONB DEFAULT '[]',
    brochure_url TEXT,
    source_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_scraped TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. GOALS — User financial goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    target_year INTEGER NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    monthly_contribution NUMERIC(12, 2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CONVERSATIONS — Chat session metadata
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    summary TEXT,
    extracted_context JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. MESSAGES — Individual chat messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SIMULATIONS — Saved simulation sessions
CREATE TABLE IF NOT EXISTS simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Untitled Simulation',
    profile_snapshot JSONB NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
    total_monthly_savings NUMERIC(12, 2),
    total_gap NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SIMULATION_RESULTS — Per-goal results within a simulation
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    target_amount NUMERIC(15, 2),
    future_value NUMERIC(15, 2),
    years_remaining INTEGER,
    monthly_savings_required NUMERIC(12, 2),
    current_gap NUMERIC(15, 2),
    projected_corpus NUMERIC(15, 2),
    coverage_ratio NUMERIC(5, 4),
    inflation_rate NUMERIC(5, 4),
    expected_return NUMERIC(5, 4),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. RECOMMENDATIONS — Product recommendations for a simulation
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT,
    rank INTEGER,
    composite_score NUMERIC(5, 2),
    similarity_score NUMERIC(5, 4),
    goal_coverage_score NUMERIC(5, 4),
    category_fit_score NUMERIC(5, 4),
    matched_goals JSONB DEFAULT '[]',
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_simulation_id ON simulation_results(simulation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_simulation_id ON recommendations(simulation_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Data isolation per user
-- ============================================================

-- Profiles: users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Products: readable by all authenticated users, writable by service role only
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_select ON products FOR SELECT TO authenticated USING (true);

-- Goals: users own their goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_select ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY goals_insert ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_update ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY goals_delete ON goals FOR DELETE USING (auth.uid() = user_id);

-- Conversations: users own their conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_select ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY conversations_insert ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY conversations_update ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY conversations_delete ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages: users own their messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Simulations: users own their simulations
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulations_select ON simulations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY simulations_insert ON simulations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY simulations_update ON simulations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY simulations_delete ON simulations FOR DELETE USING (auth.uid() = user_id);

-- Simulation Results: users own their results
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY sim_results_select ON simulation_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sim_results_insert ON simulation_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recommendations: users own their recommendations
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY recommendations_select ON recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY recommendations_insert ON recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE on signup (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to allow re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- AUTO-UPDATE updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER simulations_updated_at BEFORE UPDATE ON simulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
