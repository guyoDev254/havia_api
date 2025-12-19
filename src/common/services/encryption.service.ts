import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor() {
    // Get encryption key from environment variable
    // In production, use a strong, randomly generated key stored securely
    this.encryptionKey = process.env.MESSAGE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    
    if (this.encryptionKey === 'default-encryption-key-change-in-production') {
      console.warn('⚠️  WARNING: Using default encryption key. Set MESSAGE_ENCRYPTION_KEY in .env for production!');
    }
  }

  /**
   * Encrypt a message
   */
  encrypt(text: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message
   * Handles both encrypted and unencrypted messages (for backward compatibility)
   */
  decrypt(encryptedText: string): string {
    try {
      // Try to decrypt - if it fails, assume it's unencrypted (legacy data)
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      // If decryption produces a valid result, return it
      if (decrypted && decrypted.length > 0) {
        return decrypted;
      }
      
      // If decryption failed, assume it's unencrypted (legacy message)
      // Return as-is for backward compatibility
      return encryptedText;
    } catch (error) {
      // If decryption fails, assume it's unencrypted (legacy message)
      return encryptedText;
    }
  }

  /**
   * Check if a string is encrypted (basic check)
   */
  isEncrypted(text: string): boolean {
    // Encrypted strings from CryptoJS are base64-like and typically longer
    // This is a simple heuristic - you might want to add a prefix/suffix marker
    try {
      // Try to decrypt - if it works, it's encrypted
      const bytes = CryptoJS.AES.decrypt(text, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }
}

