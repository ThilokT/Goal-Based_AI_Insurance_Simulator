-- ============================================================
-- FIX: Drop ALL existing tables (old + new names)
-- CASCADE handles triggers and dependencies automatically
-- ============================================================

-- Drop old tables (from your previous schema)
DROP TABLE IF EXISTS product_features CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS users_profile CASCADE;

-- Drop tables from our new schema (if partially created)
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS simulation_results CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
