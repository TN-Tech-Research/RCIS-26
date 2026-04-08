import type { Plugin } from 'vite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function encryptedRawPlugin(): Plugin {
  return {
    name: 'encrypted-raw',
    enforce: 'pre',
    resolveId(id: string, importer?: string) {
      if (id.endsWith('.enc?raw')) {
        const cleanId = id.slice(0, -4); // strip ?raw
        const resolved = importer
          ? path.resolve(path.dirname(importer.split('?')[0]), cleanId)
          : path.resolve(cleanId);
        return '\0encrypted-raw:' + resolved;
      }
    },
    load(id: string) {
      if (!id.startsWith('\0encrypted-raw:')) return;
      const filePath = id.slice('\0encrypted-raw:'.length);
      const keyHex = process.env.CSV_KEY;
      if (!keyHex) throw new Error('[encrypted-raw] CSV_KEY environment variable is not set');
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      const colon = raw.indexOf(':');
      const iv = Buffer.from(raw.slice(0, colon), 'hex');
      const ciphertext = raw.slice(colon + 1);
      const key = Buffer.from(keyHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      return `export default ${JSON.stringify(plaintext)}`;
    },
  };
}
