/**
 * Database schema prompts for the AI SQL tool.
 * These are included in the execute_sql tool description so the LLM generates valid SQL.
 */

export const ADMIN_SCHEMA_PROMPT = `Execute readonly SELECT SQL against PostgreSQL. Always add LIMIT (max 1000). Soft-deleted tables use deleted_at IS NULL for active records.

## Tables

### usage_logs (API usage records, append-only, no soft delete)
id BIGINT PK, user_id BIGINT, api_key_id BIGINT, account_id BIGINT, group_id BIGINT NULL, subscription_id BIGINT NULL,
request_id VARCHAR(64) UNIQUE, model VARCHAR(100),
input_tokens INT, output_tokens INT, cache_creation_tokens INT, cache_read_tokens INT,
input_cost DECIMAL(20,10), output_cost DECIMAL(20,10), cache_creation_cost DECIMAL(20,10), cache_read_cost DECIMAL(20,10),
total_cost DECIMAL(20,10), actual_cost DECIMAL(20,10) (after multipliers),
rate_multiplier DECIMAL(10,4), account_rate_multiplier DECIMAL(10,4) NULL,
billing_type INT8, stream BOOLEAN, duration_ms INT NULL, first_token_ms INT NULL,
user_agent VARCHAR(512) NULL, ip_address VARCHAR(45) NULL,
image_count INT, image_size VARCHAR(10) NULL, media_type VARCHAR(16) NULL,
created_at TIMESTAMPTZ (immutable)
Key indexes: (user_id, created_at), (api_key_id, created_at), (group_id, created_at), (model), (request_id)

### users (soft delete: deleted_at)
id BIGINT PK, email VARCHAR(255) UNIQUE, password_hash, role VARCHAR(20) ('admin'|'user'),
status VARCHAR(20) ('active'|'disabled'), username VARCHAR(100), notes TEXT,
concurrency INT, balance DECIMAL(20,8),
created_at, updated_at, deleted_at TIMESTAMPTZ NULL

### api_keys (soft delete: deleted_at)
id BIGINT PK, user_id BIGINT, group_id BIGINT NULL,
key VARCHAR(128) UNIQUE, name VARCHAR(100), status VARCHAR(20),
ip_whitelist JSON NULL, ip_blacklist JSON NULL,
quota DECIMAL(20,8) (0=unlimited), quota_used DECIMAL(20,8),
expires_at TIMESTAMPTZ NULL, last_used_at TIMESTAMPTZ NULL,
created_at, updated_at, deleted_at TIMESTAMPTZ NULL

### accounts (upstream AI provider accounts, soft delete: deleted_at)
id BIGINT PK, name VARCHAR(100), platform VARCHAR(50) ('claude'|'gemini'|'openai'|...),
type VARCHAR(20) ('api_key'|'oauth'|'cookie'), credentials JSONB, extra JSONB,
proxy_id BIGINT NULL, concurrency INT, priority INT, schedulable BOOLEAN,
rate_multiplier DECIMAL(10,4), status VARCHAR(20),
error_message TEXT NULL, last_used_at TIMESTAMPTZ NULL, expires_at TIMESTAMPTZ NULL,
rate_limited_at TIMESTAMPTZ NULL, overload_until TIMESTAMPTZ NULL,
created_at, updated_at, deleted_at TIMESTAMPTZ NULL

### groups (service groups, soft delete: deleted_at)
id BIGINT PK, name VARCHAR(100) UNIQUE, description TEXT NULL, status VARCHAR(20),
rate_multiplier DECIMAL(10,4), is_exclusive BOOLEAN, platform VARCHAR(50),
subscription_type VARCHAR(20), default_validity_days INT,
daily_limit_usd DECIMAL NULL, weekly_limit_usd DECIMAL NULL, monthly_limit_usd DECIMAL NULL,
sort_order INT, created_at, updated_at, deleted_at TIMESTAMPTZ NULL

### user_subscriptions (soft delete: deleted_at)
id BIGINT PK, user_id BIGINT, group_id BIGINT, assigned_by BIGINT NULL,
starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, status VARCHAR(20),
daily_usage_usd DECIMAL(20,10), weekly_usage_usd DECIMAL(20,10), monthly_usage_usd DECIMAL(20,10),
notes TEXT NULL, created_at, updated_at, deleted_at TIMESTAMPTZ NULL
Unique: (user_id, group_id) WHERE deleted_at IS NULL

### settings (global key-value config, hard delete)
id BIGINT PK, key VARCHAR(100) UNIQUE, value TEXT, updated_at TIMESTAMPTZ

### redeem_codes (one-time codes, hard delete)
id BIGINT PK, code VARCHAR(32) UNIQUE, type VARCHAR(20), value DECIMAL(20,8),
status VARCHAR(20) ('unused'|'used'), used_by BIGINT NULL, used_at TIMESTAMPTZ NULL,
group_id BIGINT NULL, notes TEXT NULL, validity_days INT, created_at TIMESTAMPTZ

### promo_codes (multi-use registration promos, hard delete)
id BIGINT PK, code VARCHAR(32) UNIQUE, bonus_amount DECIMAL(20,8),
max_uses INT (0=unlimited), used_count INT, status VARCHAR(20),
expires_at TIMESTAMPTZ NULL, notes TEXT NULL, created_at, updated_at TIMESTAMPTZ

## Common patterns
- Active records: WHERE deleted_at IS NULL
- Usage in time range: WHERE created_at BETWEEN $start AND $end
- Cost aggregation: SUM(actual_cost) for real cost after multipliers
- Top models: GROUP BY model ORDER BY SUM(actual_cost) DESC`

export const USER_SCHEMA_PROMPT = `Execute readonly SELECT SQL against PostgreSQL. Always add LIMIT (max 1000). Soft-deleted tables use deleted_at IS NULL for active records. Data is filtered by RLS to your own records only.

## Tables

### usage_logs (API usage records, append-only)
id BIGINT PK, user_id BIGINT, api_key_id BIGINT, account_id BIGINT, group_id BIGINT NULL,
request_id VARCHAR(64) UNIQUE, model VARCHAR(100),
input_tokens INT, output_tokens INT, cache_creation_tokens INT, cache_read_tokens INT,
total_cost DECIMAL(20,10), actual_cost DECIMAL(20,10),
stream BOOLEAN, duration_ms INT NULL, first_token_ms INT NULL,
created_at TIMESTAMPTZ (immutable)

### api_keys (soft delete: deleted_at)
id BIGINT PK, user_id BIGINT, group_id BIGINT NULL,
key VARCHAR(128) UNIQUE, name VARCHAR(100), status VARCHAR(20),
quota DECIMAL(20,8), quota_used DECIMAL(20,8),
expires_at TIMESTAMPTZ NULL, last_used_at TIMESTAMPTZ NULL,
created_at, updated_at, deleted_at TIMESTAMPTZ NULL

### user_subscriptions (soft delete: deleted_at)
id BIGINT PK, user_id BIGINT, group_id BIGINT,
starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, status VARCHAR(20),
daily_usage_usd DECIMAL(20,10), weekly_usage_usd DECIMAL(20,10), monthly_usage_usd DECIMAL(20,10),
created_at, updated_at, deleted_at TIMESTAMPTZ NULL

## Common patterns
- Active records: WHERE deleted_at IS NULL
- Usage in time range: WHERE created_at BETWEEN $start AND $end
- Cost aggregation: SUM(actual_cost) for real cost after multipliers
- Top models: GROUP BY model ORDER BY SUM(actual_cost) DESC`

export const SYSTEM_PROMPT = `You are an AI data analyst for the Sub2API platform — an AI API gateway that manages subscriptions, accounts, and usage billing.

You have access to tools that let you:
1. Execute readonly SQL queries against the platform's PostgreSQL database
2. The SQL tool description contains the full database schema

When the user asks a data question:
- Use the execute_sql tool to query the database
- Present results clearly with relevant context
- Suggest follow-up analyses when appropriate

Guidelines:
- Always use LIMIT in SQL queries (max 1000 rows)
- For soft-deleted tables, add WHERE deleted_at IS NULL
- Use actual_cost (not total_cost) for real cost after multipliers
- Format currency values to 4 decimal places
- Format timestamps in a human-readable way
- If a query fails, explain the error and suggest a corrected query`
