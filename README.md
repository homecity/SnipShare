```
   _____ _   _ _____ _____   _____ _    _          _____  ______
  / ____| \ | |_   _|  __ \ / ____| |  | |   /\   |  __ \|  ____|
 | (___ |  \| | | | | |__) | (___ | |__| |  /  \  | |__) | |__
  \___ \| . ` | | | |  ___/ \___ \|  __  | / /\ \ |  _  /|  __|
  ____) | |\  |_| |_| |     ____) | |  | |/ ____ \| | \ \| |____
 |_____/|_| \_|_____|_|    |_____/|_|  |_/_/    \_\_|  \_\______|

```

# SnipShare

A secure, no-login-required text and code snippet sharing web application. Share code snippets with password protection, auto-expiration, and burn-after-reading features.

## Demo

<p align="center">
  <img src="./SnipShare.gif" alt="SnipShare Demo" width="800">
</p>

## Features

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🔓 No Login Required      Share snippets anonymously          │
│                                                                 │
│   🔒 Password Protection    AES-256 encrypted content           │
│                                                                 │
│   ⏰ Auto-Expiration        1 hour to 2 weeks, or never         │
│                                                                 │
│   🔥 Burn After Reading     One-time view, then deleted         │
│                                                                 │
│   🎨 Syntax Highlighting    25+ programming languages           │
│                                                                 │
│   📋 Copy to Clipboard      One-click copy for URL & content    │
│                                                                 │
│   📱 QR Code Sharing        Easy mobile sharing                 │
│                                                                 │
│   👁️ View Counter           Track snippet views                 │
│                                                                 │
│   🌙 Dark Mode UI           Beautiful gradient dark theme       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Languages

JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, HTML, CSS, SCSS, JSON, YAML, XML, Markdown, SQL, Bash, PowerShell, Dockerfile, and more.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Full-stack React framework |
| TypeScript | Type-safe development |
| Tailwind CSS | Utility-first styling |
| highlight.js | Syntax highlighting |
| crypto-js | AES-256 encryption |
| qrcode.react | QR code generation |
| nanoid | Unique ID generation |

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/snipshare.git
cd snipshare

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
open http://localhost:3000
```

### Production Build

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## Project Structure

```
snipshare/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── snippets/
│   │   │       ├── route.ts          # POST /api/snippets
│   │   │       └── [id]/
│   │   │           └── route.ts      # GET/POST /api/snippets/:id
│   │   ├── [id]/
│   │   │   └── page.tsx              # Snippet view page
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page (create snippet)
│   │   └── globals.css               # Global styles
│   └── lib/
│       ├── db.ts                     # Database operations
│       └── encryption.ts             # AES encryption utilities
├── data/
│   └── snippets.json                 # JSON file database
├── public/                           # Static assets
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## API Reference

### Create Snippet

```http
POST /api/snippets
Content-Type: application/json

{
  "content": "console.log('Hello World');",
  "language": "javascript",
  "title": "My Snippet",
  "password": "optional-password",
  "expiresIn": 86400000,
  "burnAfterRead": false
}
```

**Response:**
```json
{
  "id": "abc123xyz",
  "url": "/abc123xyz"
}
```

### Get Snippet

```http
GET /api/snippets/:id
```

**Response (public snippet):**
```json
{
  "id": "abc123xyz",
  "content": "console.log('Hello World');",
  "language": "javascript",
  "title": "My Snippet",
  "viewCount": 5,
  "createdAt": 1705789200,
  "expiresAt": 1705875600000,
  "burnAfterRead": false,
  "requiresPassword": false
}
```

**Response (password protected):**
```json
{
  "id": "abc123xyz",
  "requiresPassword": true,
  "language": "javascript",
  "title": "My Snippet"
}
```

### Unlock Password-Protected Snippet

```http
POST /api/snippets/:id
Content-Type: application/json

{
  "password": "your-password"
}
```

## Configuration

### Expiration Options

| Option | Duration |
|--------|----------|
| 1 Hour | 3,600,000 ms |
| 6 Hours | 21,600,000 ms |
| 1 Day | 86,400,000 ms |
| 3 Days | 259,200,000 ms |
| 1 Week | 604,800,000 ms |
| 2 Weeks | 1,209,600,000 ms |
| Never | null |

### Content Limits

- Maximum content size: 500KB
- Maximum title length: 100 characters
- Maximum expiration: 2 weeks

## Environment Variables

No environment variables required for basic setup. The application uses a local JSON file for data storage.

For production deployments, consider:

```env
# Optional: Custom port
PORT=3000

# Optional: Custom data directory
DATA_DIR=/path/to/data
```

## Development

```bash
# Run development server with hot reload
npm run dev

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Security Considerations

- Passwords are hashed using SHA-256 before storage
- Content is encrypted using AES-256 when password protected
- Burn-after-read snippets are permanently deleted after first view
- Expired snippets are automatically cleaned up on access

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

```bash
# Build and start
npm run build
npm start

# Or use PM2 for process management
pm2 start npm --name "snipshare" -- start
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [highlight.js](https://highlightjs.org/) - Syntax highlighting
- [crypto-js](https://github.com/brix/crypto-js) - JavaScript crypto library

---

```
  Made with ❤️ for developers who need to share code quickly and securely.

  ┌────────────────────────────────────────────────────────────┐
  │  "The best code is no code at all. The second best is     │
  │   code that's easy to share."                              │
  └────────────────────────────────────────────────────────────┘
```
