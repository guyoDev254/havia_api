/**
 * Migration script to encrypt existing messages in the database
 * 
 * Run this script once after implementing message encryption:
 * npx ts-node src/chat/scripts/migrate-messages-encryption.ts
 * 
 * WARNING: This script will encrypt all existing messages.
 * Make sure to backup your database before running this!
 */

import { PrismaClient } from '@prisma/client';
import * as CryptoJS from 'crypto-js';

const prisma = new PrismaClient();

const encryptionKey = process.env.MESSAGE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
}

function isEncrypted(text: string): boolean {
  try {
    const bytes = CryptoJS.AES.decrypt(text, encryptionKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted.length > 0;
  } catch {
    return false;
  }
}

async function migrateMessages() {
  console.log('🔄 Starting message encryption migration...');
  
  try {
    // Get all messages
    const messages = await prisma.message.findMany({
      select: {
        id: true,
        content: true,
      },
    });

    console.log(`📨 Found ${messages.length} messages to process`);

    let encryptedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const message of messages) {
      try {
        // Check if already encrypted
        if (isEncrypted(message.content)) {
          skippedCount++;
          continue;
        }

        // Encrypt the message
        const encryptedContent = encrypt(message.content);

        // Update in database
        await prisma.message.update({
          where: { id: message.id },
          data: { content: encryptedContent },
        });

        encryptedCount++;
        
        if (encryptedCount % 100 === 0) {
          console.log(`✅ Encrypted ${encryptedCount} messages...`);
        }
      } catch (error) {
        console.error(`❌ Error encrypting message ${message.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Encrypted: ${encryptedCount}`);
    console.log(`   ⏭️  Skipped (already encrypted): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('✨ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateMessages();

