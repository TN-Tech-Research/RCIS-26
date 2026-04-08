import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const keyHex = process.env.CSV_KEY;
if (!keyHex || keyHex.length !== 64) {
  console.error('Error: CSV_KEY must be a 64-character hex string (32 bytes).\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const csvPath = path.resolve(__dirname, '..', 'Table_numbers.csv');
const encPath = path.resolve(__dirname, '..', 'Table_numbers.enc');

const csv = fs.readFileSync(csvPath, 'utf8');
const key = Buffer.from(keyHex, 'hex');
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(csv, 'utf8', 'base64');
encrypted += cipher.final('base64');
fs.writeFileSync(encPath, iv.toString('hex') + ':' + encrypted, 'utf8');
console.log('Written: Table_numbers.enc');
