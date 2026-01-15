# Digital Ocean Spaces Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Images Can't Be Uploaded from Mobile App

**Symptoms:**
- Upload requests fail with network errors
- Images don't appear after upload
- 403 or CORS errors

**Solutions:**

1. **Check Environment Variables**
   ```bash
   # Verify these are set in your .env file:
   DO_SPACES_KEY=your_access_key
   DO_SPACES_SECRET=your_secret_key
   DO_SPACES_BUCKET=your-bucket-name
   DO_SPACES_REGION=your-region (e.g., sfo3, nyc3)
   DO_SPACES_CDN_URL=https://your-bucket.region.cdn.digitaloceanspaces.com (optional)
   ```

2. **Verify API Keys Have Write Permissions**
   - Go to DigitalOcean → API → Spaces Keys
   - Ensure your key has write access
   - Regenerate keys if needed

3. **Check CORS Configuration in DigitalOcean Spaces**
   - Go to your Space → Settings → CORS Configurations
   - Add this CORS rule:
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }
   ```
   **Note:** Using `"*"` allows all origins. For production, restrict to your specific domains:
   ```json
   {
     "AllowedOrigins": [
       "https://api.northernbox.co.ke",
       "https://admin.northernbox.co.ke",
       "https://northernbox.co.ke"
     ],
     "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }
   ```

### Issue 2: Images Can't Be Read/Displayed

**Symptoms:**
- Images upload successfully but don't display
- 403 Forbidden errors when accessing image URLs
- Images show broken image icon

**Solutions:**

1. **Verify Public Read Access**
   - Files uploaded by the API should have `public-read` ACL
   - Check the `storage.service.ts` - it should set `ACL: 'public-read'` in PutObjectCommand
   - Verify in DigitalOcean Spaces that files have public access

2. **Check URL Format**
   - CDN URL format: `https://bucket-name.region.cdn.digitaloceanspaces.com/folder/filename`
   - Direct URL format: `https://bucket-name.region.digitaloceanspaces.com/folder/filename`
   - Verify the URL returned by the API matches one of these formats

3. **Test Direct Access**
   - Copy the URL returned by the API
   - Open it in a browser or use curl:
   ```bash
   curl -I https://your-bucket.region.digitaloceanspaces.com/images/test.jpg
   ```
   - Should return `200 OK`, not `403 Forbidden`

4. **Check File Listing Settings**
   - In Space settings, ensure "File Listing" is either:
     - Enabled (for public access), OR
     - Disabled but files have public-read ACL (recommended for security)

### Issue 3: Images Can't Be Uploaded from Admin Web

**Symptoms:**
- Admin web upload form fails
- Network errors when submitting
- Files don't appear after upload

**Solutions:**

1. **Check API Endpoint**
   - Verify admin web is calling the correct API endpoint: `/upload/image` or `/upload/images`
   - Check browser console for errors

2. **Verify Authentication**
   - Ensure admin user is authenticated
   - Check that JWT token is being sent in Authorization header
   - Verify token hasn't expired

3. **Check File Size Limits**
   - Default limit is 10MB for images
   - Check if file exceeds limit
   - Verify `multer.config.ts` settings

4. **Check Content-Type**
   - Admin web should send `multipart/form-data`
   - Verify FormData is being created correctly
   - Check browser Network tab for request headers

### Issue 4: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Requests fail with "No 'Access-Control-Allow-Origin' header"

**Solutions:**

1. **Backend CORS Configuration**
   - Check `main.ts` CORS settings
   - Ensure admin web domain is in `allowedOrigins`
   - Verify `credentials: true` is set

2. **DigitalOcean Spaces CORS**
   - Configure CORS in Space settings (see Issue 1, Solution 3)
   - Ensure `AllowedMethods` includes `GET`, `HEAD`, `PUT`, `POST`

3. **Preflight Requests**
   - Ensure `OPTIONS` method is allowed in backend CORS
   - Check that preflight requests return proper headers

### Issue 5: URL Format Issues

**Symptoms:**
- Images upload but URLs are incorrect
- URLs point to wrong domain
- CDN URLs not working

**Solutions:**

1. **Verify Environment Variables**
   ```bash
   # Check these are correct:
   DO_SPACES_BUCKET=northernbox-uploads  # Your Space name
   DO_SPACES_REGION=sfo3                 # Your Space region
   DO_SPACES_CDN_URL=https://northernbox-uploads.sfo3.cdn.digitaloceanspaces.com
   ```

2. **Check URL Construction**
   - CDN URL: `${DO_SPACES_CDN_URL}/${folder}/${filename}`
   - Direct URL: `https://${bucket}.${region}.digitaloceanspaces.com/${folder}/${filename}`
   - Verify in `storage.service.ts` `getFileUrl()` method

3. **Test URL Manually**
   - Construct URL manually and test in browser
   - Compare with URL returned by API
   - Check for typos or missing slashes

## Debugging Steps

### Step 1: Verify Storage Type
Check API logs on startup - should show:
```
Storage initialized: DigitalOcean Spaces (your-bucket-name)
```
If it shows "Local filesystem", check environment variables.

### Step 2: Test Upload Endpoint
```bash
# Test with curl
curl -X POST https://api.northernbox.co.ke/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg"
```

### Step 3: Check API Response
The upload endpoint should return:
```json
{
  "url": "https://your-bucket.region.digitaloceanspaces.com/images/filename.jpg",
  "filename": "filename.jpg",
  "size": 12345,
  "mimetype": "image/jpeg"
}
```

### Step 4: Verify File in DigitalOcean
1. Go to DigitalOcean → Spaces
2. Open your Space
3. Navigate to the folder (e.g., `images/`)
4. Verify file exists and has public access

### Step 5: Test Image URL
```bash
# Test direct access
curl -I https://your-bucket.region.digitaloceanspaces.com/images/filename.jpg
# Should return 200 OK
```

## Environment Variables Checklist

- [ ] `DO_SPACES_KEY` - Access key (starts with `DO...`)
- [ ] `DO_SPACES_SECRET` - Secret key
- [ ] `DO_SPACES_BUCKET` - Space name (no `https://` or `.digitaloceanspaces.com`)
- [ ] `DO_SPACES_REGION` - Region code (e.g., `sfo3`, `nyc3`, `sgp1`)
- [ ] `DO_SPACES_CDN_URL` - CDN URL (optional, if CDN enabled)
- [ ] `BASE_URL` - API base URL (for local storage fallback)

## Common Mistakes

1. **Including protocol in bucket name**
   - ❌ Wrong: `DO_SPACES_BUCKET=https://bucket.digitaloceanspaces.com`
   - ✅ Correct: `DO_SPACES_BUCKET=bucket-name`

2. **Wrong region format**
   - ❌ Wrong: `DO_SPACES_REGION=us-east-1`
   - ✅ Correct: `DO_SPACES_REGION=sfo3`

3. **Missing trailing slash in CDN URL**
   - ❌ Wrong: `DO_SPACES_CDN_URL=https://bucket.region.cdn.digitaloceanspaces.com/`
   - ✅ Correct: `DO_SPACES_CDN_URL=https://bucket.region.cdn.digitaloceanspaces.com`

4. **Not setting public-read ACL**
   - Files must have `ACL: 'public-read'` to be accessible
   - Check `storage.service.ts` uploadFile method

## Still Having Issues?

1. Check API logs for detailed error messages
2. Verify all environment variables are loaded correctly
3. Test with a simple curl command first
4. Check DigitalOcean Spaces dashboard for file access logs
5. Verify API keys haven't been revoked or expired
