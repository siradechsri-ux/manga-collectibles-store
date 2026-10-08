CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STAFF', 'FINANCE', 'ADMIN');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_email_not_blank CHECK (length(btrim(email)) > 0),
  CONSTRAINT users_password_hash_not_blank CHECK (length(password_hash) > 0),
  CONSTRAINT users_full_name_not_blank CHECK (length(btrim(full_name)) > 0),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT refresh_tokens_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT refresh_tokens_hash_sha256_format
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX refresh_tokens_user_id_idx
  ON refresh_tokens (user_id);

CREATE INDEX refresh_tokens_expires_at_idx
  ON refresh_tokens (expires_at);
