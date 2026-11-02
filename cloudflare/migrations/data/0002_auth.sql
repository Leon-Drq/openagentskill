-- Better Auth 1.7.15 D1 schema. DATE values are ISO UTC strings as required by
-- its SQLite adapter. These tables are accessible only through the server.
CREATE TABLE auth_users (
  id TEXT NOT NULL PRIMARY KEY REFERENCES account_identities(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  emailVerified INTEGER NOT NULL CHECK (emailVerified IN (0,1)),
  image TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);
-- Atomic with user creation; an unsuccessful insert rolls back the anchor.
CREATE TRIGGER auth_user_identity BEFORE INSERT ON auth_users BEGIN
  INSERT INTO account_identities(id) VALUES (NEW.id) ON CONFLICT(id) DO NOTHING;
END;
CREATE TABLE auth_sessions (
  id TEXT NOT NULL PRIMARY KEY,
  expiresAt DATE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE
);
CREATE INDEX auth_sessions_userId_idx ON auth_sessions(userId);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expiresAt);
CREATE TABLE auth_accounts (
  id TEXT NOT NULL PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL CHECK (providerId IN ('credential','github')),
  userId TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt DATE,
  refreshTokenExpiresAt DATE,
  scope TEXT,
  password TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  UNIQUE(providerId,accountId),
  UNIQUE(userId,providerId),
  CHECK (providerId <> 'credential' OR accountId = userId)
);
CREATE INDEX auth_accounts_userId_idx ON auth_accounts(userId);
CREATE TABLE auth_verifications (
  id TEXT NOT NULL PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt DATE NOT NULL,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);
CREATE INDEX auth_verifications_identifier_idx ON auth_verifications(identifier);
CREATE INDEX auth_verifications_expiry_idx ON auth_verifications(expiresAt);
CREATE TABLE auth_rate_limits (
  id TEXT NOT NULL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL CHECK (count >= 0),
  lastRequest BIGINT NOT NULL
);
CREATE INDEX auth_rate_limits_expiry_idx ON auth_rate_limits(lastRequest);
-- D1 has no interactive transactions. Password reset/change and session
-- revocation must be atomic even if a later library cleanup request fails.
CREATE TRIGGER auth_password_revoke_sessions AFTER UPDATE OF password ON auth_accounts
WHEN OLD.password IS NOT NEW.password BEGIN
  DELETE FROM auth_sessions WHERE userId = NEW.userId;
END;
