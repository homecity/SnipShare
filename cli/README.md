# snip — SnipShare CLI

A fast, minimal CLI for [SnipShare](https://steveyu.au) — share code snippets from your terminal.

## Install

```bash
# Install globally
npm install -g snipshare-cli

# Or run directly
npx snipshare-cli create file.py
```

## Quick Start

```bash
# Share a file
snip create main.py

# Pipe from stdin
cat script.sh | snip -l bash

# Get a snippet
snip get abc123def0

# Pipe to file
snip get abc123def0 > output.py
```

## Usage

### Create Snippets

```bash
# From a file (language auto-detected)
snip create server.ts

# From stdin with options
echo "Hello World" | snip -t "Greeting" -l plaintext -e 1h

# Password protected + burn after reading
snip create secret.env -p mypassword -b

# Copy URL to clipboard after creation
snip create notes.md -c
```

### Read Snippets

```bash
# Get content (by ID)
snip get abc123def0

# Shorthand — just the ID
snip abc123def0

# Password-protected snippet
snip get abc123def0 -p mypassword

# Get metadata
snip info abc123def0
```

### Configuration

```bash
# Set default server
snip config server https://snipit.sh

# View all config
snip config
```

## Options

| Flag | Description |
|------|-------------|
| `-t, --title <title>` | Snippet title |
| `-l, --language <lang>` | Language for syntax highlighting |
| `-p, --password <pw>` | Password protect / unlock |
| `-e, --expires <dur>` | Expiration: `1h`, `6h`, `1d`, `3d`, `1w`, `2w`, `never` |
| `-b, --burn` | Burn after reading (one-time view) |
| `-c, --copy` | Copy URL to clipboard |
| `-s, --server <url>` | Server URL |
| `-r, --raw` | Raw output (no formatting) |

## Piping

`snip` is designed to work in Unix pipelines:

```bash
# Create and share in one step
git diff | snip -t "My changes" -l bash

# Download a snippet
snip get abc123 > file.py

# Chain with other tools
snip get abc123 | grep "TODO"
```

When stdout is not a TTY (e.g., piped), `snip create` outputs only the URL — perfect for scripting.

## Config File

Configuration is stored at `~/.config/snipshare/config.json`:

```json
{
  "server": "https://steveyu.au"
}
```

## Zero Dependencies

`snip` uses only Node.js built-in modules. No `node_modules` needed.

## License

MIT
