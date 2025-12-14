# Havia API

Backend API for the NorthernBox Havia mobile app built with NestJS and Prisma.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up the database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

4. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`
API documentation (Swagger) will be available at `http://localhost:3000/api`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

- `DATABASE_URL` - PostgreSQL connection string
  - Example: `postgresql://postgres:postgres@localhost:5432/havia_db?schema=public`
  
- `JWT_SECRET` - Secret key for JWT tokens (minimum 32 characters)
  - Example: `your-super-secret-jwt-key-change-this-in-production-min-32-chars`
  - Generate a secure key: `openssl rand -base64 32`
  
- `JWT_EXPIRES_IN` - JWT token expiration (default: `7d`)
  - Examples: `1h`, `7d`, `30d`
  
- `PORT` - Server port (default: `3000`)
  
- `CORS_ORIGIN` - Allowed CORS origin
  - Development: `http://localhost:19006` (Expo default)
  - Production: Your actual domain (e.g., `https://app.northernbox.com`)

- `NODE_ENV` - Environment mode (default: `development`)
  - Options: `development`, `production`, `test`

### Email Configuration (SMTP)

The API uses Nodemailer for sending emails (password reset, email verification, etc.). Configure the following variables:

- `SMTP_HOST` - SMTP server hostname
  - Gmail: `smtp.gmail.com`
  - SendGrid: `smtp.sendgrid.net`
  - AWS SES: `email-smtp.us-east-1.amazonaws.com` (varies by region)
  
- `SMTP_PORT` - SMTP server port
  - Common ports: `587` (TLS), `465` (SSL), `25` (unencrypted)
  
- `SMTP_SECURE` - Use SSL/TLS (default: `false`)
  - Set to `"true"` for port 465 (SSL)
  - Set to `"false"` for port 587 (TLS/STARTTLS)
  
- `SMTP_USER` - SMTP username
  - Gmail: Your Gmail address
  - SendGrid: `apikey`
  - AWS SES: Your SES SMTP username
  
- `SMTP_PASS` - SMTP password
  - Gmail: Use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)
  - SendGrid: Your SendGrid API key
  - AWS SES: Your SES SMTP password
  
- `SMTP_FROM` - Default "from" email address
  - Example: `noreply@northernbox.com`
  - Must be verified in your email service

- `FRONTEND_URL` - Frontend URL for email links
  - Development: `http://localhost:19006`
  - Production: Your actual frontend URL

### File Upload Configuration

- `UPLOAD_PATH` - Directory for uploaded files (default: `./uploads`)
- `BASE_URL` - Base URL for serving uploaded files (default: `http://localhost:8000`)

See `.env.example` for a complete template with example values.

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user

### Users
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile

### Clubs
- `GET /clubs` - Get all clubs
- `GET /clubs/:id` - Get club by ID
- `POST /clubs` - Create a new club
- `POST /clubs/:id/join` - Join a club
- `POST /clubs/:id/leave` - Leave a club

### Events
- `GET /events` - Get all events
- `GET /events/:id` - Get event by ID
- `POST /events` - Create a new event
- `POST /events/:id/rsvp` - RSVP to an event
- `POST /events/:id/cancel-rsvp` - Cancel RSVP

### Mentorship
- `GET /mentorship` - Get all mentorship sessions
- `GET /mentorship/:id` - Get mentorship by ID
- `POST /mentorship/request` - Request mentorship
- `POST /mentorship/:id/accept` - Accept mentorship request
- `POST /mentorship/:id/complete` - Complete mentorship

### Badges
- `GET /badges` - Get all badges
- `GET /badges/:id` - Get badge by ID

### Notifications
- `GET /notifications` - Get all notifications
- `GET /notifications/unread-count` - Get unread count
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read

### Chat
- `GET /chat/conversations` - Get all conversations
- `GET /chat/messages/:userId` - Get messages with user
- `POST /chat/send` - Send a message
- `PUT /chat/messages/:id/read` - Mark message as read

## Database Schema

The database schema is defined in `prisma/schema.prisma`. Key models:

- **User** - User accounts and profiles
- **Club** - Community clubs
- **Event** - Events and workshops
- **Mentorship** - Mentorship relationships
- **Badge** - Achievement badges
- **Notification** - User notifications
- **Message** - Chat messages

## Development

- Run migrations: `npm run prisma:migrate`
- Open Prisma Studio: `npm run prisma:studio`
- Generate Prisma Client: `npm run prisma:generate`

