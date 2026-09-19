import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const NEON_DB_URL = "postgresql://neondb_owner:npg_BzylSi5fu7ZQ@ep-silent-mouse-aptlwy7d-pooler.c-7.us-east-1.aws.neon.tech/whatsup?sslmode=require";
const PROD_ENCRYPTION_KEY = "rl8SL4wLxxWRhc3hgToGOq2Br52M/8G1Lfj0spWVY8Y=";

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function decrypt(stored: string, keyBase64: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const key = Buffer.from(keyBase64, 'base64');
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + 16);
  const data = raw.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: NEON_DB_URL,
    },
  },
});

async function main() {
  console.log('Connecting to production Neon DB...');
  
  const workspaces = await prisma.workspace.findMany({
    where: { id: 'seed-workspace' },
    select: {
      id: true,
      metaOAuthToken: true,
    }
  });

  for (const workspace of workspaces) {
    console.log(`\nChecking permissions for Workspace User Token: ${workspace.id}`);
    if (!workspace.metaOAuthToken) {
      console.log('No user token stored in workspace.');
      continue;
    }

    try {
      const decrypted = decrypt(workspace.metaOAuthToken, PROD_ENCRYPTION_KEY);
      
      // Call /me/permissions using the user token
      const res = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${decrypted}`);
      console.log('Status:', res.status, res.statusText);
      const data = await res.json() as any;
      console.log('Granted Permissions:');
      console.log(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error('Failed to retrieve permissions:', err.message || err);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
