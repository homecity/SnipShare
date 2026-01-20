import CryptoJS from 'crypto-js';

export function encryptContent(content: string, password: string): string {
  return CryptoJS.AES.encrypt(content, password).toString();
}

export function decryptContent(encryptedContent: string, password: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    return decrypted;
  } catch {
    return null;
  }
}
