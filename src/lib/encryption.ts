// Web Crypto API based encryption (Cloudflare Workers compatible)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a key from password using PBKDF2
async function deriveKey(
  password: string,
  salt: Uint8Array,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

// Encrypt content with AES-GCM
export async function encryptContent(
  content: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ['encrypt']);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(content)
  );

  // Pack: salt(16) + iv(12) + ciphertext
  const result = {
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encrypted),
  };

  return JSON.stringify(result);
}

// Decrypt content with AES-GCM
export async function decryptContent(
  encryptedContent: string,
  password: string
): Promise<string | null> {
  try {
    const { salt, iv, data } = JSON.parse(encryptedContent);
    const saltBuffer = new Uint8Array(base64ToArrayBuffer(salt));
    const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
    const dataBuffer = base64ToArrayBuffer(data);

    const key = await deriveKey(password, saltBuffer, ['decrypt']);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer as unknown as BufferSource },
      key,
      dataBuffer
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// ── Server-side encryption (per-file random key) ──────────────────────

// Generate a random AES-256 key, return as Base64
export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(raw);
}

// Encrypt ArrayBuffer with a Base64-encoded AES-256 key (IV prepended)
export async function encryptWithKey(
  data: ArrayBuffer,
  keyBase64: string
): Promise<ArrayBuffer> {
  const rawKey = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data
  );

  // Pack: iv(12) + ciphertext (includes auth tag)
  const result = new Uint8Array(12 + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), 12);
  return result.buffer;
}

// Decrypt ArrayBuffer with a Base64-encoded AES-256 key (IV prepended)
export async function decryptWithKey(
  data: ArrayBuffer,
  keyBase64: string
): Promise<ArrayBuffer> {
  const rawKey = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const bytes = new Uint8Array(data);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  return await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );
}

// Hash password with PBKDF2 (for storage/verification)
export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return {
    hash: arrayBufferToBase64(hashBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
  };
}

// Encrypt binary data (ArrayBuffer) with AES-GCM
export async function encryptBuffer(
  data: ArrayBuffer,
  password: string
): Promise<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ['encrypt']);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data
  );

  // Pack: salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(16 + 12 + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, 16);
  result.set(new Uint8Array(encrypted), 28);
  return result.buffer;
}

// Decrypt binary data (ArrayBuffer) with AES-GCM
export async function decryptBuffer(
  data: ArrayBuffer,
  password: string
): Promise<ArrayBuffer | null> {
  try {
    const bytes = new Uint8Array(data);
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ciphertext = bytes.slice(28);

    const key = await deriveKey(password, salt, ['decrypt']);

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext
    );
  } catch {
    return null;
  }
}

// Verify password against stored hash
export async function verifyPasswordHash(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const salt = new Uint8Array(base64ToArrayBuffer(storedSalt));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const computedHash = arrayBufferToBase64(hashBuffer);
    return computedHash === storedHash;
  } catch {
    return false;
  }
}
