import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly passkey: string;
  private readonly shortcode: string;
  private readonly callbackUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {
    this.consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY') || '';
    this.consumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET') || '';
    this.passkey = this.configService.get<string>('MPESA_PASSKEY') || '';
    this.shortcode = this.configService.get<string>('MPESA_SHORTCODE') || '';
    this.callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL') || '';
  }

  /**
   * Get OAuth access token from M-Pesa
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 55 minutes (tokens expire in 1 hour)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      return this.accessToken;
    } catch (error: any) {
      this.logger.error('Failed to get M-Pesa access token:', error.response?.data || error.message);
      throw new BadRequestException('Failed to initialize M-Pesa payment');
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return password;
  }

  /**
   * Generate timestamp for STK Push
   */
  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<{ CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string; CustomerMessage: string }> {
    if (!this.consumerKey || !this.consumerSecret || !this.passkey || !this.shortcode) {
      throw new BadRequestException('M-Pesa credentials not configured');
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    if (!/^2547\d{8}$/.test(formattedPhone)) {
      throw new BadRequestException('Invalid phone number format. Must be 2547XXXXXXXX');
    }

    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const stkPushUrl = this.configService.get<string>('MPESA_ENV') === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      const response = await axios.post(
        stkPushUrl,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(amount), // M-Pesa requires integer amount
          PartyA: formattedPhone,
          PartyB: this.shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: this.callbackUrl,
          AccountReference: accountReference.substring(0, 12), // Max 12 characters
          TransactionDesc: transactionDesc.substring(0, 13), // Max 13 characters
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`STK Push initiated for ${formattedPhone}, Amount: ${amount}, CheckoutRequestID: ${response.data.CheckoutRequestID}`);

      return {
        CheckoutRequestID: response.data.CheckoutRequestID,
        ResponseCode: response.data.ResponseCode,
        ResponseDescription: response.data.ResponseDescription,
        CustomerMessage: response.data.CustomerMessage,
      };
    } catch (error: any) {
      this.logger.error('STK Push failed:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.errorMessage || 
        error.response?.data?.ResponseDescription || 
        'Failed to initiate M-Pesa payment'
      );
    }
  }

  /**
   * Verify payment status using CheckoutRequestID
   */
  async verifyPayment(checkoutRequestId: string): Promise<any> {
    if (!this.consumerKey || !this.consumerSecret) {
      throw new BadRequestException('M-Pesa credentials not configured');
    }

    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const queryUrl = this.configService.get<string>('MPESA_ENV') === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

      const response = await axios.post(
        queryUrl,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('Payment verification failed:', error.response?.data || error.message);
      throw new BadRequestException('Failed to verify payment status');
    }
  }
}

