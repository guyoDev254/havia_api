# DigitalOcean Spaces Setup Guide

This guide explains how to configure the Havia API to use DigitalOcean Spaces for image and file uploads in production.

## Overview

DigitalOcean Spaces is an S3-compatible object storage service that provides:
- **Scalability**: Unlimited storage that scales with your needs
- **CDN**: Built-in CDN for fast global file delivery
- **Reliability**: 99.99% uptime SLA with automatic backups
- **Cost-effective**: Pay only for what you use (typically $5/month for 250GB + CDN)
- **Better performance**: Files served from CDN edge locations, not your API server

## Setup Instructions

### 1. Create a DigitalOcean Space

1. Log in to [DigitalOcean Control Panel](https://cloud.digitalocean.com)
2. Go to **Spaces** → **Create a Space**
3. Choose settings:
   - **Region**: Choose closest to your users (e.g., `nyc3` for US East, `sgp1` for Asia)
   - **Space name**: e.g., `northernbox-uploads`
   - **File listing**: Disable for security (recommended)
   - **CDN**: Enable for better performance (recommended)
4. Click **Create a Space**

### 2. Create API Keys

1. Go to **API** → **Spaces Keys**
2. Click **Generate New Key**
3. Give it a name (e.g., "Havia API Production")
4. **Save both**:
   - **Access Key** (starts with `DO...`)
   - **Secret Key** (shown only once!)

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# DigitalOcean Spaces Configuration
DO_SPACES_KEY=your_access_key_here
DO_SPACES_SECRET=your_secret_key_here
DO_SPACES_BUCKET=northernbox-uploads
DO_SPACES_REGION=sfo3
DO_SPACES_ENDPOINT=https://sfo3.digitaloceanspaces.com
DO_SPACES_CDN_URL=https://northernbox-uploads.sfo3.cdn.digitaloceanspaces.com
```

**For your specific Space** (`https://northernbox-uploads.sfo3.digitaloceanspaces.com`):
- **Bucket name**: `northernbox-uploads` → `DO_SPACES_BUCKET`
- **Region**: `sfo3` (San Francisco 3) → `DO_SPACES_REGION`
- **Endpoint**: `https://sfo3.digitaloceanspaces.com` → `DO_SPACES_ENDPOINT` (optional, auto-detected if not set)
- **CDN URL**: If you enabled CDN, it will be something like `https://northernbox-uploads.sfo3.cdn.digitaloceanspaces.com` → `DO_SPACES_CDN_URL`

**Note**: 
- `DO_SPACES_ENDPOINT` is optional - it will be auto-detected from the region if not provided
- Get the CDN URL from your Space settings → Settings → CDN after enabling CDN
- If CDN is disabled, leave `DO_SPACES_CDN_URL` empty or omit it

### 4. Enable CDN (Recommended)

1. In your Space settings, go to **Settings** → **CDN**
2. Enable CDN
3. Copy the CDN endpoint URL
4. Update `DO_SPACES_CDN_URL` in your `.env`

### 5. Set CORS (If needed)

If your frontend needs to access files directly:

1. In Space settings → **Settings** → **CORS Configurations**
2. Add CORS rule:
   ```json
   {
     "AllowedOrigins": ["https://yourdomain.com"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }
   ```

### 6. Set Public Read Access

Files uploaded by the API will have `public-read` ACL, making them publicly accessible. This is required for serving images to users.

## How It Works

### Automatic Fallback

The system automatically detects storage type:
- **If `DO_SPACES_KEY` is set**: Uses DigitalOcean Spaces
- **Otherwise**: Uses local filesystem storage (existing behavior)

### Upload Flow

1. File is uploaded via Multer (saved temporarily to disk)
2. If Spaces is configured:
   - File is read from disk
   - Uploaded to DigitalOcean Spaces
   - Local temp file is deleted
   - Returns Spaces CDN URL
3. If local storage:
   - File remains on disk
   - Returns local server URL

### File URLs

**Spaces (CDN enabled)** - Your Space:
```
https://northernbox-uploads.sfo3.cdn.digitaloceanspaces.com/images/image-123.jpg
```

**Spaces (direct)** - Your Space:
```
https://northernbox-uploads.sfo3.digitaloceanspaces.com/images/image-123.jpg
```

**Local storage**:
```
https://api.northernbox.co.ke/uploads/images/image-123.jpg
```

## Migration from Local Storage

### Option 1: Fresh Start (Recommended for new deployments)
- Set up Spaces
- Old files remain on local storage
- New uploads go to Spaces
- Old URLs continue to work (served from local storage)

### Option 2: Migrate Existing Files
Create a migration script to upload existing files to Spaces:

```typescript
// migration script example
const files = fs.readdirSync('./uploads');
for (const file of files) {
  const buffer = fs.readFileSync(`./uploads/${file}`);
  await storageService.uploadFile(buffer, file, 'images');
}
```

## Cost Estimation

- **Storage**: $5/month for first 250GB, then $0.02/GB
- **Bandwidth**: First 1TB free (via CDN), then $0.01/GB
- **Requests**: Free for first 1 million GET requests/month

**Typical usage for a growing app**: ~$5-15/month

## Security Best Practices

1. **Never commit** `DO_SPACES_SECRET` to git
2. Use **environment variables** or secrets manager
3. Set **file listing** to disabled in Space settings
4. Consider **restricting CORS** to your domains only
5. Use **CDN** for better performance and DDoS protection

## Troubleshooting

### Files not uploading
- Check `DO_SPACES_KEY` and `DO_SPACES_SECRET` are correct
- Verify Space name matches `DO_SPACES_BUCKET`
- Check Space region matches `DO_SPACES_REGION`
- Ensure API keys have write permissions

### Files not accessible
- Verify Space has public file listing or files have `public-read` ACL
- Check CDN is properly configured if using `DO_SPACES_CDN_URL`
- Verify CORS settings if accessing from browser

### High costs
- Enable CDN to reduce bandwidth costs
- Set up lifecycle policies to delete old files automatically
- Monitor usage in DigitalOcean dashboard

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DO_SPACES_KEY` | Yes* | Spaces access key | `DOXXXXXXXXXXXXXX` |
| `DO_SPACES_SECRET` | Yes* | Spaces secret key | `secret_key_here` |
| `DO_SPACES_BUCKET` | Yes* | Space name | `northernbox-uploads` |
| `DO_SPACES_REGION` | Yes* | Space region | `nyc3`, `sgp1`, `ams3` |
| `DO_SPACES_ENDPOINT` | No | Custom endpoint (auto-detected if not set) | `https://nyc3.digitaloceanspaces.com` |
| `DO_SPACES_CDN_URL` | No | CDN endpoint URL (if CDN enabled) | `https://cdn-endpoint.nyc3.cdn.digitaloceanspaces.com` |

*Required only if using Spaces (local storage used otherwise)

