# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN yarn prisma:generate

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install all dependencies (including dev dependencies for Prisma CLI)
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy Prisma files and generate client
COPY prisma ./prisma
RUN yarn prisma:generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p uploads/profile-images uploads/images uploads/files uploads/resources uploads/club-logos uploads/club-banners

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "--max-old-space-size=2048", "dist/main"]

