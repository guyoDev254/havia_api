# Docker Setup for Havia API

This guide explains how to run the Havia API using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Basic knowledge of Docker commands

## Quick Start

1. **Ensure your `.env` file exists** with your database configuration:
   - `DATABASE_URL` - Your PostgreSQL connection string (e.g., Neon, Supabase, or local)
   - Other required environment variables (JWT_SECRET, etc.)

2. **Build and start the API service:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

4. **Run database migrations** (if needed):
   ```bash
   docker-compose exec api npx prisma migrate deploy
   ```

5. **Seed the database** (optional):
   ```bash
   docker-compose exec api yarn prisma:seed
   ```

**Note:** This setup uses your existing database from `.env` file. If you need a local PostgreSQL database, use `docker-compose.dev.yml` instead.

## Development Setup

### Option 1: Use External Database (Recommended)
If you're using an external database (like Neon, Supabase, etc.):

```bash
# Run API locally with your .env database
yarn install
yarn prisma:generate
yarn start:dev
```

### Option 2: Use Local PostgreSQL in Docker
For local development with PostgreSQL in Docker:

```bash
# Start only PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# Update your .env DATABASE_URL to point to localhost:5432
# Then run API locally
yarn install
yarn prisma:generate
yarn start:dev
```

## Production Deployment

### Using Docker Compose

1. Set `NODE_ENV=production` in your `.env` file
2. Update all secrets (JWT_SECRET, MESSAGE_ENCRYPTION_KEY, etc.)
3. Configure SMTP settings for email functionality
4. Build and start:
   ```bash
   docker-compose up -d --build
   ```

### Using Docker Only

1. **Build the image:**
   ```bash
   docker build -t havia-api .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name havia-api \
     -p 8000:8000 \
     --env-file .env \
     -v uploads_data:/app/uploads \
     --link havia-postgres:postgres \
     havia-api
   ```

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `MESSAGE_ENCRYPTION_KEY` - Key for message encryption

### Optional Variables:
- `PORT` - API port (default: 8000)
- `NODE_ENV` - Environment (development/production)
- `SMTP_*` - Email configuration
- `CORS_ORIGIN` - Allowed CORS origins
- `BASE_URL` - Base URL for file serving

## Volumes

- `postgres_data` - PostgreSQL data persistence
- `uploads_data` - Uploaded files storage

## Health Checks

The API includes a health check endpoint at `/health` that Docker uses to monitor the service.

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f api

# Restart API
docker-compose restart api

# Access API container shell
docker-compose exec api sh

# Run Prisma commands
docker-compose exec api npx prisma studio
docker-compose exec api npx prisma migrate dev
docker-compose exec api yarn prisma:seed

# Remove everything (including volumes)
docker-compose down -v
```

## Troubleshooting

### Database Connection Issues

If the API can't connect to your database:
1. Verify `DATABASE_URL` in `.env` is correct and accessible
2. Check if your database allows connections from Docker containers
3. For cloud databases (Neon, Supabase), ensure your IP is whitelisted or connection pooling is enabled
4. Check logs: `docker-compose logs api`
5. Test connection manually: `docker-compose exec api npx prisma db pull`

### Port Already in Use

If port 8000 is already in use:
1. Change `PORT` in `.env` file
2. Update port mapping in `docker-compose.yml`

### Migration Issues

If migrations fail:
```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
docker-compose exec api npx prisma migrate deploy
```

## Security Notes

- Never commit `.env` file to version control
- Use strong secrets for JWT_SECRET and MESSAGE_ENCRYPTION_KEY
- In production, use Docker secrets or a secrets management service
- Regularly update base images for security patches

