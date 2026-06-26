import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const envPath = new URL('../backend/.env', import.meta.url);
const content = await readFile(envPath, 'utf8');
const nextSecret = randomBytes(48).toString('base64url');
const nextContent = /^JWT_SECRET=.*$/m.test(content)
  ? content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${nextSecret}"`)
  : `${content.trimEnd()}\nJWT_SECRET="${nextSecret}"\n`;

await writeFile(envPath, nextContent, 'utf8');
console.log('JWT secret rotated successfully. Existing login tokens are now invalid.');
