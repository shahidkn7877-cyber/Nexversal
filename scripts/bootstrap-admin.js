/**
 * Explicit server-side administrative bootstrap script.
 * Usage: node scripts/bootstrap-admin.js
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env
 * Safely creates or verifies the primary ADMIN user account in PostgreSQL.
 * Never overwrites existing passwords.
 * Never prints passwords to the console.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables if not loaded
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const { PrismaClient } = require(path.resolve(process.cwd(), 'node_modules/@prisma/client'));
const { scryptSync, randomBytes } = require('crypto');

function hashPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function main() {
  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!rawEmail || !rawEmail.trim() || !rawPassword || !rawPassword.trim()) {
    console.log(JSON.stringify({
      status: 'SKIPPED_NO_CREDENTIALS',
      message: 'ADMIN_EMAIL or ADMIN_PASSWORD is not configured in .env',
    }));
    process.exit(0);
  }

  const email = rawEmail.toLowerCase().trim();
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: 'ADMIN' },
        });
      }
      console.log(JSON.stringify({
        status: 'ALREADY_EXISTS',
        email,
        role: 'ADMIN',
        message: 'Admin account already exists in database. Existing password preserved.',
      }));
      return;
    }

    const passwordHash = hashPassword(rawPassword);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'System Administrator',
        role: 'ADMIN',
      },
    });

    console.log(JSON.stringify({
      status: 'CREATED',
      email: created.email,
      role: 'ADMIN',
      message: 'Secure admin account bootstrapped successfully.',
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({
    status: 'ERROR',
    message: err.message,
  }));
  process.exit(1);
});

