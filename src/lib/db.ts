import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'snippets.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database file if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ snippets: [] }, null, 2));
}

export interface Snippet {
  id: string;
  content: string;
  language: string;
  title: string | null;
  password_hash: string | null;
  is_encrypted: boolean;
  expires_at: number | null;
  burn_after_read: boolean;
  view_count: number;
  created_at: number;
  is_deleted: boolean;
}

interface Database {
  snippets: Snippet[];
}

function readDb(): Database {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { snippets: [] };
  }
}

function writeDb(db: Database): void {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export interface CreateSnippetInput {
  id: string;
  content: string;
  language?: string;
  title?: string;
  password?: string;
  expiresIn?: number; // milliseconds
  burnAfterRead?: boolean;
}

// Simple password hashing (using crypto)
function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Create a new snippet
export function createSnippet(input: CreateSnippetInput): Snippet {
  const {
    id,
    content,
    language = 'plaintext',
    title,
    password,
    expiresIn,
    burnAfterRead = false,
  } = input;

  const expiresAt = expiresIn ? Date.now() + expiresIn : null;
  const passwordHash = password ? hashPassword(password) : null;

  const snippet: Snippet = {
    id,
    content,
    language,
    title: title || null,
    password_hash: passwordHash,
    is_encrypted: !!password,
    expires_at: expiresAt,
    burn_after_read: burnAfterRead,
    view_count: 0,
    created_at: Math.floor(Date.now() / 1000),
    is_deleted: false,
  };

  const db = readDb();
  db.snippets.push(snippet);
  writeDb(db);

  return snippet;
}

// Get snippet by ID
export function getSnippetById(id: string): Snippet | null {
  const db = readDb();
  const snippet = db.snippets.find(s => s.id === id && !s.is_deleted);

  if (!snippet) return null;

  // Check if expired
  if (snippet.expires_at && snippet.expires_at < Date.now()) {
    markAsDeleted(id);
    return null;
  }

  return snippet;
}

// Increment view count
export function incrementViewCount(id: string): void {
  const db = readDb();
  const snippet = db.snippets.find(s => s.id === id);
  if (snippet) {
    snippet.view_count += 1;
    writeDb(db);
  }
}

// Mark snippet as deleted
export function markAsDeleted(id: string): void {
  const db = readDb();
  const snippet = db.snippets.find(s => s.id === id);
  if (snippet) {
    snippet.is_deleted = true;
    writeDb(db);
  }
}

// Verify password
export function verifyPassword(snippet: Snippet, password: string): boolean {
  if (!snippet.password_hash) return true;
  return hashPassword(password) === snippet.password_hash;
}

// Clean up expired snippets (can be called periodically)
export function cleanupExpiredSnippets(): number {
  const db = readDb();
  let count = 0;

  db.snippets.forEach(snippet => {
    if (snippet.expires_at && snippet.expires_at < Date.now() && !snippet.is_deleted) {
      snippet.is_deleted = true;
      count++;
    }
  });

  if (count > 0) {
    writeDb(db);
  }

  return count;
}
