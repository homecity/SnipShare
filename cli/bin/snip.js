#!/usr/bin/env node

/**
 * snip — SnipShare CLI
 *
 * Usage:
 *   snip create [file]              Create a snippet from file or stdin
 *   snip get <id>                   Get a snippet's content
 *   snip info <id>                  Get snippet metadata
 *   snip delete <id>                Delete a snippet (admin)
 *   snip config [key] [value]       Get/set configuration
 *
 * Options:
 *   -t, --title <title>             Snippet title
 *   -l, --language <lang>           Language for syntax highlighting
 *   -p, --password <pw>             Password protect the snippet
 *   -e, --expires <duration>        Expiration: 1h, 6h, 1d, 3d, 1w, 2w, never
 *   -b, --burn                      Burn after reading (one-time view)
 *   -r, --raw                       Output raw content (no formatting)
 *   -s, --server <url>              Server URL (default: https://steveyu.au)
 *   -c, --copy                      Copy URL to clipboard after creation
 *   -h, --help                      Show help
 *   -v, --version                   Show version
 *
 * Pipe support:
 *   cat file.py | snip              Create snippet from stdin
 *   echo "hello" | snip -l bash     Create with language
 *   snip get abc123 | less          Pipe output to pager
 *
 * Config:
 *   snip config server https://steveyu.au    Set default server
 *   snip config                              Show all config
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { extname, basename } from 'node:path';

const VERSION = '1.0.0';
const CONFIG_DIR = join(homedir(), '.config', 'snipshare');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_SERVER = 'https://steveyu.au';

// Language detection from file extension
const EXT_TO_LANG = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.py': 'python', '.pyw': 'python',
  '.java': 'java',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cxx': 'cpp', '.cc': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.scala': 'scala',
  '.html': 'html', '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.xml': 'xml',
  '.md': 'markdown', '.markdown': 'markdown',
  '.sql': 'sql',
  '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.ps1': 'powershell',
  '.dockerfile': 'dockerfile',
};

// Expiration parsing
const EXPIRE_MAP = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '2w': 14 * 24 * 60 * 60 * 1000,
  'never': 0,
};

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Disable colors if not TTY or NO_COLOR is set
const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const color = isTTY ? c : Object.fromEntries(Object.keys(c).map(k => [k, '']));

function loadConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function getServer(args) {
  // CLI flag takes priority
  const idx = args.indexOf('--server') !== -1 ? args.indexOf('--server') : args.indexOf('-s');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1].replace(/\/$/, '');

  // Then config
  const config = loadConfig();
  if (config.server) return config.server.replace(/\/$/, '');

  return DEFAULT_SERVER;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') { opts.help = true; continue; }
    if (arg === '-v' || arg === '--version') { opts.version = true; continue; }
    if (arg === '-b' || arg === '--burn') { opts.burn = true; continue; }
    if (arg === '-r' || arg === '--raw') { opts.raw = true; continue; }
    if (arg === '-c' || arg === '--copy') { opts.copy = true; continue; }

    if ((arg === '-t' || arg === '--title') && args[i + 1]) { opts.title = args[++i]; continue; }
    if ((arg === '-l' || arg === '--language') && args[i + 1]) { opts.language = args[++i]; continue; }
    if ((arg === '-p' || arg === '--password') && args[i + 1]) { opts.password = args[++i]; continue; }
    if ((arg === '-e' || arg === '--expires') && args[i + 1]) { opts.expires = args[++i]; continue; }
    if ((arg === '-s' || arg === '--server') && args[i + 1]) { opts.server = args[++i]; continue; }

    positional.push(arg);
  }

  return { opts, positional };
}

function showHelp() {
  console.log(`
${color.bold}snip${color.reset} — SnipShare CLI

${color.bold}Usage:${color.reset}
  ${color.cyan}snip create${color.reset} [file]              Create a snippet from file or stdin
  ${color.cyan}snip get${color.reset} <id>                   Get a snippet's content
  ${color.cyan}snip info${color.reset} <id>                  Get snippet metadata
  ${color.cyan}snip config${color.reset} [key] [value]       Get/set configuration
  cat file.py | ${color.cyan}snip${color.reset}              Create snippet from piped input

${color.bold}Create Options:${color.reset}
  -t, --title <title>       Snippet title
  -l, --language <lang>     Language (auto-detected from file extension)
  -p, --password <pw>       Password protect the snippet
  -e, --expires <duration>  Expiration: 1h, 6h, 1d, 3d, 1w, 2w, never (default: 3d)
  -b, --burn                Burn after reading (one-time view)
  -c, --copy                Copy URL to clipboard after creation

${color.bold}General Options:${color.reset}
  -s, --server <url>        Server URL (default: ${DEFAULT_SERVER})
  -r, --raw                 Output raw content (no metadata)
  -h, --help                Show this help
  -v, --version             Show version

${color.bold}Examples:${color.reset}
  ${color.dim}# Create from file${color.reset}
  snip create main.py

  ${color.dim}# Create from stdin${color.reset}
  cat script.sh | snip -l bash -t "My Script"

  ${color.dim}# Create with password and burn${color.reset}
  snip create secret.txt -p mypassword -b

  ${color.dim}# Get snippet content${color.reset}
  snip get abc123def0

  ${color.dim}# Pipe to file${color.reset}
  snip get abc123def0 > output.py

  ${color.dim}# Set default server${color.reset}
  snip config server https://snipit.sh
`);
}

async function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

function detectLanguage(filename) {
  const ext = extname(filename).toLowerCase();
  return EXT_TO_LANG[ext] || 'plaintext';

}

function parseExpiration(str) {
  if (!str) return EXPIRE_MAP['3d'];
  const key = str.toLowerCase();
  if (key in EXPIRE_MAP) return EXPIRE_MAP[key];

  // Try parsing as ms number
  const num = parseInt(key);
  if (!isNaN(num)) return num;

  console.error(`${color.red}Error:${color.reset} Unknown expiration "${str}". Use: 1h, 6h, 1d, 3d, 1w, 2w, never`);
  process.exit(1);
}

async function copyToClipboard(text) {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  const commands = [
    'pbcopy',                    // macOS
    'xclip -selection clipboard', // Linux X11
    'xsel --clipboard --input',   // Linux X11 alt
    'wl-copy',                    // Linux Wayland
  ];

  for (const cmd of commands) {
    try {
      await execAsync(`echo -n "${text.replace(/"/g, '\\"')}" | ${cmd}`);
      return true;
    } catch { /* try next */ }
  }
  return false;
}

async function createSnippet(server, content, opts) {
  const body = {
    content,
    language: opts.language || 'plaintext',
    title: opts.title || undefined,
    password: opts.password || undefined,
    expiresIn: parseExpiration(opts.expires),
    burnAfterRead: opts.burn || false,
  };

  const res = await fetch(`${server}/api/snippets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`${color.red}Error:${color.reset} ${data.error || 'Failed to create snippet'}`);
    process.exit(1);
  }

  const url = `${server}/${data.id}`;
  const rawUrl = `${server}/api/snippets/${data.id}/raw`;

  if (isTTY) {
    console.log(`\n${color.green}✓${color.reset} Snippet created!\n`);
    console.log(`  ${color.bold}URL:${color.reset}  ${color.cyan}${url}${color.reset}`);
    console.log(`  ${color.bold}Raw:${color.reset}  ${color.dim}${rawUrl}${color.reset}`);
    console.log(`  ${color.bold}ID:${color.reset}   ${data.id}`);

    if (opts.burn) {
      console.log(`\n  ${color.yellow}⚠ Burn after reading enabled${color.reset} — link works once`);
    }
    if (opts.password) {
      console.log(`  ${color.yellow}🔒 Password protected${color.reset}`);
    }

    const expLabel = opts.expires
      ? (opts.expires === 'never' ? 'Never' : opts.expires)
      : '3d';
    console.log(`  ${color.dim}Expires: ${expLabel}${color.reset}\n`);
  } else {
    // Non-TTY: just output the URL for piping
    process.stdout.write(url + '\n');
  }

  if (opts.copy) {
    const copied = await copyToClipboard(url);
    if (copied && isTTY) {
      console.log(`  ${color.green}📋 URL copied to clipboard${color.reset}\n`);
    }
  }
}

async function getSnippet(server, id, opts) {
  // Try raw endpoint first for simple output
  const res = await fetch(`${server}/api/snippets/${id}/raw`);

  if (res.status === 403) {
    // Password protected
    if (!opts.password) {
      console.error(`${color.red}Error:${color.reset} This snippet is password protected. Use -p <password>`);
      process.exit(1);
    }

    // Use JSON API with password
    const jsonRes = await fetch(`${server}/api/snippets/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: opts.password }),
    });

    const data = await jsonRes.json();
    if (!jsonRes.ok) {
      console.error(`${color.red}Error:${color.reset} ${data.error || 'Failed to unlock snippet'}`);
      process.exit(1);
    }

    process.stdout.write(data.content);
    if (isTTY && !data.content.endsWith('\n')) process.stdout.write('\n');
    return;
  }

  if (res.status === 404) {
    console.error(`${color.red}Error:${color.reset} Snippet not found or has expired.`);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`${color.red}Error:${color.reset} Failed to fetch snippet (HTTP ${res.status})`);
    process.exit(1);
  }

  const content = await res.text();
  process.stdout.write(content);
  if (isTTY && !content.endsWith('\n')) process.stdout.write('\n');
}

async function getSnippetInfo(server, id) {
  const res = await fetch(`${server}/api/snippets/${id}`);
  const data = await res.json();

  if (!res.ok) {
    console.error(`${color.red}Error:${color.reset} ${data.error || 'Snippet not found'}`);
    process.exit(1);
  }

  console.log(`\n${color.bold}Snippet Info${color.reset}`);
  console.log(`  ${color.bold}ID:${color.reset}         ${data.id}`);
  console.log(`  ${color.bold}Title:${color.reset}      ${data.title || 'Untitled'}`);
  console.log(`  ${color.bold}Language:${color.reset}   ${data.language}`);
  console.log(`  ${color.bold}Views:${color.reset}      ${data.viewCount}`);
  console.log(`  ${color.bold}Created:${color.reset}    ${new Date(data.createdAt * 1000).toLocaleString()}`);

  if (data.expiresAt) {
    const remaining = data.expiresAt - Date.now();
    const label = remaining <= 0 ? 'Expired' :
      remaining > 86400000 ? `${Math.floor(remaining / 86400000)}d remaining` :
      remaining > 3600000 ? `${Math.floor(remaining / 3600000)}h remaining` :
      'Less than 1h remaining';
    console.log(`  ${color.bold}Expires:${color.reset}    ${label}`);
  } else {
    console.log(`  ${color.bold}Expires:${color.reset}    Never`);
  }

  if (data.burnAfterRead) console.log(`  ${color.yellow}🔥 Burn after reading${color.reset}`);
  if (data.requiresPassword) console.log(`  ${color.yellow}🔒 Password protected${color.reset}`);
  console.log();
}

function handleConfig(positional) {
  const config = loadConfig();

  if (positional.length === 0) {
    // Show all config
    console.log(`\n${color.bold}Configuration${color.reset} (${CONFIG_FILE})\n`);
    if (Object.keys(config).length === 0) {
      console.log(`  ${color.dim}(empty — using defaults)${color.reset}`);
    } else {
      for (const [key, value] of Object.entries(config)) {
        console.log(`  ${color.bold}${key}:${color.reset} ${value}`);
      }
    }
    console.log();
    return;
  }

  const [key, ...rest] = positional;
  const value = rest.join(' ');

  if (!value) {
    // Get single key
    if (config[key]) {
      console.log(config[key]);
    } else {
      console.log(`${color.dim}(not set)${color.reset}`);
    }
    return;
  }

  // Set key
  config[key] = value;
  saveConfig(config);
  console.log(`${color.green}✓${color.reset} ${key} = ${value}`);
}

// Main
async function main() {
  const { opts, positional } = parseArgs(process.argv);

  if (opts.version) {
    console.log(`snip ${VERSION}`);
    return;
  }

  if (opts.help) {
    showHelp();
    return;
  }

  const command = positional[0];
  const server = getServer(process.argv.slice(2));

  // Config command
  if (command === 'config') {
    handleConfig(positional.slice(1));
    return;
  }

  // Info command
  if (command === 'info') {
    const id = positional[1];
    if (!id) {
      console.error(`${color.red}Error:${color.reset} Please provide a snippet ID. Usage: snip info <id>`);
      process.exit(1);
    }
    await getSnippetInfo(server, id);
    return;
  }

  // Get command
  if (command === 'get') {
    const id = positional[1];
    if (!id) {
      console.error(`${color.red}Error:${color.reset} Please provide a snippet ID. Usage: snip get <id>`);
      process.exit(1);
    }
    await getSnippet(server, id, opts);
    return;
  }

  // Create command (explicit or implicit via stdin)
  if (command === 'create' || !command) {
    const file = command === 'create' ? positional[1] : null;
    let content;
    let language = opts.language;

    if (file) {
      // Read from file
      if (!existsSync(file)) {
        console.error(`${color.red}Error:${color.reset} File not found: ${file}`);
        process.exit(1);
      }
      content = readFileSync(file, 'utf-8');
      if (!language) language = detectLanguage(file);
      if (!opts.title) opts.title = basename(file);
    } else {
      // Read from stdin
      content = await readStdin();
      if (!content) {
        showHelp();
        return;
      }
    }

    if (!content || !content.trim()) {
      console.error(`${color.red}Error:${color.reset} No content to create snippet from.`);
      process.exit(1);
    }

    opts.language = language || 'plaintext';
    await createSnippet(server, content, opts);
    return;
  }

  // Unknown command — maybe it's a snippet ID shorthand (snip abc123)
  if (command && !command.startsWith('-')) {
    // Try as a get shorthand
    await getSnippet(server, command, opts);
    return;
  }

  showHelp();
}

main().catch(err => {
  console.error(`${color.red}Error:${color.reset} ${err.message}`);
  process.exit(1);
});
