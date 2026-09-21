/**
 * Security, Cryptography, and Privacy Defense Utilities
 * - PBKDF2-SHA256 salted password hashing (Web Crypto API)
 * - Cryptographic Session Token (JWT-like HMAC-SHA256) with expiry and revocation blacklist
 * - Password Reset Token Engine (15-min expiry, single-use, rate-limited, user-bound)
 * - Safe File Upload Sanitization and Validation (anti-path traversal, executable blocking)
 * - Field-level filtering and PII redaction
 * - Client-Side Rate Limiter (Brute-force, Mass-registration, and Spam Flooding Defense)
 * - Input Sanitization (Anti-XSS, Anti-HTML Injection)
 */

// ============================================================================
// 0. INPUT SANITIZATION (ANTI-XSS, ANTI-INJECTION)
// ============================================================================

/**
 * Sanitizes generic user-submitted text by stripping HTML tags, javascript: protocols,
 * and dangerous execution entities while preserving legitimate punctuation.
 */
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Strip HTML opening/closing tags
    .replace(/<[^>]*>/g, '')
    // Strip javascript: or data: pseudo-protocols
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    // Strip control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

// ============================================================================
// 0.1 CLIENT-SIDE RATE LIMITING ENGINE (BRUTE-FORCE & FLOODING DEFENSE)
// ============================================================================

interface RateLimitEntry {
  count: number;
  firstTimestamp: number;
  blockedUntil?: number;
}

const RATE_LIMIT_PREFIX = 'oass_rl_';

export function checkRateLimit(
  actionKey: string,
  maxRequests: number,
  windowMs: number,
  blockDurationMs = 60000
): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
  try {
    const key = `${RATE_LIMIT_PREFIX}${actionKey}`;
    const now = Date.now();
    const raw = sessionStorage.getItem(key);
    let entry: RateLimitEntry = raw ? JSON.parse(raw) : { count: 0, firstTimestamp: now };

    // Check if actively blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    // If window expired, reset window
    if (now - entry.firstTimestamp > windowMs) {
      entry = { count: 1, firstTimestamp: now };
      sessionStorage.setItem(key, JSON.stringify(entry));
      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Increment count
    entry.count += 1;
    if (entry.count > maxRequests) {
      entry.blockedUntil = now + blockDurationMs;
      sessionStorage.setItem(key, JSON.stringify(entry));
      const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    sessionStorage.setItem(key, JSON.stringify(entry));
    return { allowed: true, remaining: Math.max(0, maxRequests - entry.count) };
  } catch {
    // If storage restricted, allow action
    return { allowed: true, remaining: maxRequests };
  }
}

export function resetRateLimit(actionKey: string): void {
  try {
    sessionStorage.removeItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
  } catch {}
}

// Convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array with dedicated ArrayBuffer
function hexToBuffer(hex: string): Uint8Array {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Base64URL encoding/decoding for JWT-like session tokens
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Internal persistent HMAC secret for session verification
const SESSION_SECRET_KEY = 'oass_crypto_session_master_key_v1';
function getSessionMasterKey(): string {
  let key = localStorage.getItem(SESSION_SECRET_KEY);
  if (!key) {
    const rand = crypto.getRandomValues(new Uint8Array(32));
    key = bufferToHex(rand.buffer);
    localStorage.setItem(SESSION_SECRET_KEY, key);
  }
  return key;
}

/**
 * ============================================================================
 * 1. PASSWORD HASHING & VERIFICATION (PBKDF2-SHA256)
 * ============================================================================
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedBits);
  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const salt = hexToBuffer(parts[2]);
    const expectedHashHex = parts[3];

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const calculatedHashHex = bufferToHex(derivedBits);
    return calculatedHashHex === expectedHashHex;
  }

  // Fallback for legacy demo/unmigrated passwords
  return password === storedHash;
}

/**
 * ============================================================================
 * 2. JWT / CRYPTOGRAPHIC SESSION TOKEN ENGINE & REVOCATION BLACKLIST
 * ============================================================================
 */
export interface SessionTokenPayload {
  userId: string;
  role: string;
  email: string;
  iat: number;
  exp: number; // Unix timestamp (milliseconds)
  jti: string; // Unique token ID
}

const REVOKED_TOKENS_KEY = 'oass_revoked_session_tokens_v1';

export function getRevokedTokens(): string[] {
  try {
    const val = localStorage.getItem(REVOKED_TOKENS_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export function revokeSessionToken(token: string): void {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload: SessionTokenPayload = JSON.parse(base64UrlDecode(parts[1]));
      const revoked = getRevokedTokens();
      if (!revoked.includes(payload.jti)) {
        revoked.push(payload.jti);
        localStorage.setItem(REVOKED_TOKENS_KEY, JSON.stringify(revoked.slice(-100))); // Keep last 100
      }
    }
  } catch (err) {
    console.warn('Failed to parse token for revocation');
  }
}

async function signMessage(message: string, secretHex: string): Promise<string> {
  const enc = new TextEncoder();
  const secretBytes = hexToBuffer(secretHex);
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bufferToHex(signature);
}

export async function createSessionToken(
  user: { id: string; role: string; email: string },
  expiresInHours = 2
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const jti = bufferToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const payload: SessionTokenPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    iat: Date.now(),
    exp: Date.now() + expiresInHours * 60 * 60 * 1000,
    jti,
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signMessage(`${encHeader}.${encPayload}`, getSessionMasterKey());

  return `${encHeader}.${encPayload}.${signature}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ valid: boolean; payload?: SessionTokenPayload; error?: string }> {
  if (!token) return { valid: false, error: 'No token provided' };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, error: 'Malformed token structure' };

  const [encHeader, encPayload, signature] = parts;

  // 1. Verify HMAC Signature
  const expectedSig = await signMessage(`${encHeader}.${encPayload}`, getSessionMasterKey());
  if (signature !== expectedSig) {
    return { valid: false, error: 'Invalid cryptographic signature' };
  }

  // 2. Decode Payload
  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encPayload));
  } catch {
    return { valid: false, error: 'Corrupt token payload' };
  }

  // 3. Check Expiry
  if (Date.now() > payload.exp) {
    return { valid: false, error: 'Session token has expired' };
  }

  // 4. Check Revocation Blacklist
  const revoked = getRevokedTokens();
  if (revoked.includes(payload.jti)) {
    return { valid: false, error: 'Session token has been revoked' };
  }

  return { valid: true, payload };
}

/**
 * ============================================================================
 * 3. PASSWORD RESET TOKEN ENGINE (15-min Expiry, Single-Use, User-Bound)
 * ============================================================================
 */
export interface PasswordResetTokenRecord {
  token: string;
  email: string;
  userId: string;
  expiresAt: number; // Max 15 minutes
  used: boolean;
  attempts: number;
}

const RESET_TOKENS_KEY = 'oass_password_reset_tokens_v1';

function getResetTokens(): PasswordResetTokenRecord[] {
  try {
    const val = localStorage.getItem(RESET_TOKENS_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

function saveResetTokens(records: PasswordResetTokenRecord[]): void {
  localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(records));
}

/**
 * Creates a cryptographically random, single-use, 15-minute time-limited password reset token.
 * Rate limited to maximum 3 requests per 15 minutes per email to prevent denial of service and enumeration.
 */
export function generatePasswordResetToken(
  email: string,
  userId: string
): { success: boolean; token?: string; expiresAt?: number; code?: string; error?: string } {
  const normEmail = email.toLowerCase().trim();

  // Rate limit: Max 3 password reset requests per 15 minutes per email
  const rateLimit = checkRateLimit(`pwd_reset_${normEmail}`, 3, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many password reset requests for this account. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  // Generate random 6-digit verification code using Web Crypto
  const randomUint32 = crypto.getRandomValues(new Uint32Array(1))[0];
  const displayCode = String((randomUint32 % 900000) + 100000); // Guarantees 6-digits 100000-999999

  // Also create random 32-byte secret token
  const randBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bufferToHex(randBytes.buffer);

  const expiresAt = Date.now() + 15 * 60 * 1000; // Strictly 15 minutes max

  const record: PasswordResetTokenRecord = {
    token: displayCode,
    email: normEmail,
    userId,
    expiresAt,
    used: false,
    attempts: 0,
  };

  // Invalidate any prior active tokens for this user email
  const existing = getResetTokens().filter(
    (t) => t.email !== record.email && t.expiresAt > Date.now()
  );
  existing.push(record);
  saveResetTokens(existing);

  return { success: true, token, expiresAt, code: displayCode };
}

/**
 * Verifies and atomically consumes the password reset token.
 */
export function verifyAndConsumeResetToken(
  email: string,
  enteredCode: string
): { valid: boolean; userId?: string; error?: string } {
  const normEmail = email.toLowerCase().trim();
  const cleanCode = enteredCode.trim();

  const tokens = getResetTokens();
  const recordIndex = tokens.findIndex((t) => t.email === normEmail);

  if (recordIndex === -1) {
    return { valid: false, error: 'No active password recovery request found for this email.' };
  }

  const record = tokens[recordIndex];

  // 1. Check if already used
  if (record.used) {
    return { valid: false, error: 'This recovery code has already been used. Please request a new one.' };
  }

  // 2. Check expiration (15 minutes max)
  if (Date.now() > record.expiresAt) {
    return { valid: false, error: 'Verification code has expired. Reset links are valid for 15 minutes only.' };
  }

  // 3. Brute force prevention (max 3 failed attempts)
  if (record.attempts >= 3) {
    record.used = true; // Burn token
    saveResetTokens(tokens);
    return { valid: false, error: 'Too many incorrect attempts. This recovery token has been invalidated.' };
  }

  // 4. Validate token code
  if (record.token !== cleanCode) {
    record.attempts += 1;
    saveResetTokens(tokens);
    const remaining = 3 - record.attempts;
    return { valid: false, error: `Invalid verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)` };
  }

  // 5. Success: Atomically mark single-use token as consumed
  record.used = true;
  saveResetTokens(tokens);

  return { valid: true, userId: record.userId };
}

/**
 * ============================================================================
 * 4. FILE UPLOAD SANITIZATION & RESTRICTIONS
 * ============================================================================
 */
const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'asp', 'aspx', 'jsp',
  'html', 'htm', 'xhtml', 'svg', 'js', 'jsx', 'ts', 'tsx', 'vbs', 'scr', 'dll', 'com'
]);

/**
 * Sanitizes file name to prevent Path Traversal (../), Null-byte injection, and Stored XSS.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed_upload';
  // Strip paths (both POSIX and Windows)
  const baseName = fileName.replace(/^.*[\\/]/, '');
  // Remove dangerous control characters, quotes, angles
  const cleaned = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Avoid multiple consecutive dots
  return cleaned.replace(/\.{2,}/g, '.');
}

/**
 * Validates file upload against whitelist, blacklist, and size restrictions.
 */
export function validateUploadedFile(
  file: { name: string; size: number; type?: string },
  allowedTypes: string[],
  maxSizeMb: number
): { valid: boolean; sanitizedName: string; error?: string } {
  const sanitizedName = sanitizeFileName(file.name);
  const ext = sanitizedName.split('.').pop()?.toLowerCase() || '';

  // 1. Check dangerous executable/script extensions
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      sanitizedName,
      error: `Security Violation: Executable or active script files (.${ext}) are strictly prohibited.`,
    };
  }

  // 2. Whitelist match (Exact match, never substring)
  const normalizedAllowed = allowedTypes.map((t) => t.toLowerCase().replace(/^\./, '').trim());
  const isAllowed = normalizedAllowed.includes(ext);

  if (!isAllowed) {
    return {
      valid: false,
      sanitizedName,
      error: `Invalid file format ".${ext}". Allowed formats: ${normalizedAllowed.map((e) => `.${e}`).join(', ')}`,
    };
  }

  // 3. Size validation
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      sanitizedName,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum permitted limit of ${maxSizeMb} MB.`,
    };
  }

  // 4. MIME type check
  if (file.type) {
    const dangerousMimes = ['text/html', 'application/x-msdownload', 'application/javascript', 'image/svg+xml'];
    if (dangerousMimes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        sanitizedName,
        error: `Security Violation: Upload MIME type "${file.type}" is rejected.`,
      };
    }
  }

  return { valid: true, sanitizedName };
}

/**
 * ============================================================================
 * 5. SECURE STORAGE & COOKIE HANDLING (XSS / DATA ISOLATION DEFENSE)
 * ============================================================================
 */
export const SESSION_TOKEN_STORAGE_KEY = 'oass_jwt_session_token_v1';
export const CREDENTIALS_STORAGE_KEY = 'oass_user_credentials_v1';

/**
 * Sets a cookie with Secure and SameSite=Strict flags.
 * (Note: In pure client-side JavaScript, HttpOnly cannot be set via document.cookie;
 * HttpOnly cookies are set via backend HTTP response headers).
 */
export function setSecureCookie(name: string, value: string, maxAgeSeconds = 7200): void {
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const securePart = isHttps ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Strict${securePart}`;
  } catch {
    // Non-browser or storage restricted environment
  }
}

export function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(name) + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

export function clearCookie(name: string): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; SameSite=Strict`;
  } catch {
    // Graceful fallback
  }
}

/**
 * Session storage isolation:
 * Prefers sessionStorage (ephemeral to the tab, cleared on close, resistant to cross-tab XSS persistence)
 * with graceful fallback to localStorage and SameSite=Strict cookies.
 */
export function storeSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    setSecureCookie(SESSION_TOKEN_STORAGE_KEY, token, 7200);
  } catch {
    // Fallback if sessionStorage is disabled/restricted
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
  }
}

export function retrieveSessionToken(): string | null {
  try {
    const fromSession = sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (fromSession) return fromSession;

    const fromCookie = getCookie(SESSION_TOKEN_STORAGE_KEY);
    if (fromCookie) return fromCookie;

    return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function removeSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {}
  try {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {}
  clearCookie(SESSION_TOKEN_STORAGE_KEY);
}

/**
 * ============================================================================
 * 6. ISOLATED CREDENTIALS STORE (Zero Passwords in User Directory)
 * ============================================================================
 */
interface CredentialRecord {
  passwordHash: string;
  updatedAt: string;
}

function getCredentialsMap(): Record<string, CredentialRecord> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCredentialsMap(map: Record<string, CredentialRecord>): void {
  try {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function getStoredCredentialHash(userId: string): string | undefined {
  const map = getCredentialsMap();
  return map[userId]?.passwordHash;
}

export function setStoredCredentialHash(userId: string, passwordHash: string): void {
  const map = getCredentialsMap();
  map[userId] = {
    passwordHash,
    updatedAt: new Date().toISOString(),
  };
  saveCredentialsMap(map);
}

export function removeStoredCredential(userId: string): void {
  const map = getCredentialsMap();
  if (map[userId]) {
    delete map[userId];
    saveCredentialsMap(map);
  }
}

/**
 * ============================================================================
 * 7. DATA PRIVACY & FIELD-LEVEL SANITIZATION
 * ============================================================================
 */
export function redactSensitive(content: string): string {
  if (!content) return '';
  return content
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
    .replace(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g, '[REDACTED_PHONE]')
    .replace(/(?:sk_|key-|bearer\s+|sb_)[a-zA-Z0-9_-]{16,}/gi, '[REDACTED_SECRET]');
}

export function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password: _, ...cleanUser } = user;
  return cleanUser;
}

/**
 * Role-aware field-level filtering:
 * Enforces principle of least privilege on all user profile disclosures.
 * - Always strips passwords and credential hashes.
 * - If requester is viewing another user's profile and is not an administrator,
 *   strips private PII: phone, residential address, personal bio, alternate email, and dates.
 */
export function filterUserDataForClient<T extends Record<string, any>>(
  user: T,
  requester?: { id?: string; role?: string } | null
): Partial<T> {
  if (!user) return user;

  // 1. Strip passwords unconditionally
  const { password, ...withoutPassword } = user;

  // 2. If self-access or admin access, return full sanitized profile
  if (requester && (requester.id === user.id || requester.role === 'admin')) {
    return withoutPassword as Partial<T>;
  }

  // 3. Third-party view: Strip private contact identifiers and personal records
  const {
    phone,
    address,
    bio,
    alternateEmail,
    dateOfJoining,
    createdAt,
    ...publicDirectoryProfile
  } = withoutPassword;

  return publicDirectoryProfile as Partial<T>;
}

