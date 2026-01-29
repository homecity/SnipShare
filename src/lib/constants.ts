/**
 * Shared constants for SnipShare
 * Used by both frontend and backend to keep file extension lists in sync.
 */

export const DEFAULT_ALLOWED_EXTENSIONS = [
  // Text / Documents
  '.txt', '.md', '.pdf', '.json', '.csv', '.log', '.xml', '.yaml', '.yml',
  '.html', '.css', '.js', '.ts', '.py', '.sh', '.sql', '.rtf',
  // Office
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // LibreOffice
  '.odt', '.ods', '.odp',
  // Archives
  '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2',
  // Torrents
  '.torrent',
  // Frontend frameworks
  '.jsx', '.tsx', '.vue', '.svelte',
  // Programming languages
  '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.hpp',
  // Config files
  '.ini', '.toml', '.env', '.conf', '.cfg',
  // Scripts
  '.bat', '.ps1',
  // Audio
  '.mp3', '.wav', '.ogg', '.flac',
  // Video
  '.mp4', '.webm', '.mov',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff',
  // Fonts
  '.woff', '.woff2', '.ttf', '.otf',
  // Certificates
  '.key', '.pem', '.crt', '.cer',
  // Patches
  '.diff', '.patch',
  // Build files
  '.dockerfile', '.makefile',
];

export const EXTENSION_TO_MIME: Record<string, string> = {
  // Text / Documents
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.log': 'text/plain',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.py': 'text/x-python',
  '.sh': 'application/x-sh',
  '.sql': 'application/sql',
  '.rtf': 'application/rtf',
  // Office
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // LibreOffice
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',
  '.bz2': 'application/x-bzip2',
  // Torrents
  '.torrent': 'application/x-bittorrent',
  // Frontend frameworks
  '.jsx': 'text/jsx',
  '.tsx': 'text/tsx',
  '.vue': 'text/x-vue',
  '.svelte': 'text/x-svelte',
  // Programming languages
  '.java': 'text/x-java-source',
  '.go': 'text/x-go',
  '.rs': 'text/x-rustsrc',
  '.rb': 'text/x-ruby',
  '.php': 'application/x-httpd-php',
  '.c': 'text/x-csrc',
  '.cpp': 'text/x-c++src',
  '.h': 'text/x-chdr',
  '.hpp': 'text/x-c++hdr',
  // Config files
  '.ini': 'text/plain',
  '.toml': 'text/plain',
  '.env': 'text/plain',
  '.conf': 'text/plain',
  '.cfg': 'text/plain',
  // Scripts
  '.bat': 'application/x-bat',
  '.ps1': 'application/x-powershell',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  // Certificates
  '.key': 'application/x-pem-file',
  '.pem': 'application/x-pem-file',
  '.crt': 'application/x-x509-ca-cert',
  '.cer': 'application/x-x509-ca-cert',
  // Patches
  '.diff': 'text/x-diff',
  '.patch': 'text/x-diff',
  // Build files
  '.dockerfile': 'text/plain',
  '.makefile': 'text/plain',
};
