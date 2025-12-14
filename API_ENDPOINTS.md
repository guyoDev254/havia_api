# Havia API - Complete Endpoints Documentation

## Base URL
- Development: `http://localhost:8000`
- Production: Configure via `PORT` environment variable

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication (`/auth`)

### POST `/auth/register`
Register a new user
- **Body**: `RegisterDto`
  - `email` (string, required)
  - `phone` (string, optional)
  - `password` (string, min 6 chars)
  - `firstName` (string, required)
  - `lastName` (string, required)
- **Response**: `{ user, token }`

### POST `/auth/login`
Login user
- **Body**: `LoginDto`
  - `email` (string, required)
  - `password` (string, required)
- **Response**: `{ user, token }`

---

## 👤 Users (`/users`)

### GET `/users/me` 🔒
Get current user profile
- **Auth**: Required
- **Response**: User profile with clubs, badges, stats

### PUT `/users/me` 🔒
Update current user profile
- **Auth**: Required
- **Body**: `UpdateProfileDto`
  - `firstName`, `lastName`, `phone`, `bio`, `profileImage`, `location`, `skills`, `interests`, `education`, `occupation`, `website`
- **Response**: Updated user profile

### GET `/users/:id` 🔒
Get user by ID
- **Auth**: Required
- **Response**: User profile

---

## 🎯 Clubs (`/clubs`)

### GET `/clubs`
Get all clubs
- **Query Params**:
  - `category` (optional): TECH, BUSINESS, CREATIVE, HEALTH, LEADERSHIP, EDUCATION, OTHER
  - `limit` (optional): number
- **Response**: Array of clubs with member counts

### GET `/clubs/:id`
Get club by ID
- **Response**: Club details with members, events, stats

### POST `/clubs` 🔒
Create a new club
- **Auth**: Required
- **Body**: `CreateClubDto`
  - `name` (required)
  - `description`, `image`, `category`, `isPublic` (optional)
- **Response**: Created club

### GET `/clubs/:id/members`
Get club members
- **Response**: Array of club members

### POST `/clubs/:id/join` 🔒
Join a club
- **Auth**: Required
- **Response**: Updated club
- **Notifications**: Creates notification for club creator

### POST `/clubs/:id/leave` 🔒
Leave a club
- **Auth**: Required
- **Response**: Success

---

## 📅 Events (`/events`)

### GET `/events`
Get all events
- **Query Params**:
  - `status` (optional): UPCOMING, ONGOING, COMPLETED, CANCELLED
  - `type` (optional): WORKSHOP, MEETUP, CONFERENCE, WEBINAR, CHALLENGE, OTHER
  - `limit` (optional): number
- **Response**: Array of events

### GET `/events/:id`
Get event by ID
- **Response**: Event details with organizer, attendees, club

### POST `/events` 🔒
Create a new event
- **Auth**: Required
- **Body**: `CreateEventDto`
  - `title` (required)
  - `description`, `image`, `type`, `status`, `startDate`, `endDate`, `location`, `isOnline`, `onlineLink`, `maxAttendees`, `clubId` (optional)
- **Response**: Created event

### POST `/events/:id/rsvp` 🔒
RSVP to an event
- **Auth**: Required
- **Response**: Updated event
- **Notifications**: Creates notification for event organizer

### POST `/events/:id/cancel-rsvp` 🔒
Cancel RSVP
- **Auth**: Required
- **Response**: Success

### GET `/events/:id/attendees`
Get event attendees
- **Response**: Array of attendees

---

## 🤝 Mentorship (`/mentorship`)

### GET `/mentorship` 🔒
Get all mentorship sessions for current user
- **Auth**: Required
- **Query Params**:
  - `status` (optional): PENDING, ACTIVE, COMPLETED, CANCELLED
- **Response**: Array of mentorships

### GET `/mentorship/:id` 🔒
Get mentorship by ID
- **Auth**: Required
- **Response**: Mentorship details

### GET `/mentorship/mentors` 🔒
Get available mentors
- **Auth**: Required
- **Query Params**:
  - `search` (optional): Search by name, bio, skills
- **Response**: Array of potential mentors

### POST `/mentorship/request` 🔒
Request mentorship
- **Auth**: Required
- **Body**: `RequestMentorshipDto`
  - `mentorId` (required)
  - `goals` (optional)
- **Response**: Created mentorship request
- **Notifications**: Creates notification for mentor

### POST `/mentorship/apply` 🔒
Apply to become a mentor
- **Auth**: Required
- **Body**: `ApplyMentorDto`
  - `bio`, `expertise`, `availability`, `goals` (optional)
- **Response**: Updated user profile

### POST `/mentorship/:id/accept` 🔒
Accept mentorship request
- **Auth**: Required (mentor only)
- **Response**: Updated mentorship
- **Notifications**: Creates notification for mentee

### POST `/mentorship/:id/complete` 🔒
Complete mentorship
- **Auth**: Required (mentor or mentee)
- **Response**: Updated mentorship

---

## 🏆 Badges (`/badges`)

### GET `/badges`
Get all badges
- **Query Params**:
  - `type` (optional): PARTICIPATION, LEARNING, MENTORSHIP, LEADERSHIP, ACHIEVEMENT
- **Response**: Array of badges

### GET `/badges/:id`
Get badge by ID
- **Response**: Badge details

### GET `/badges/user` 🔒
Get current user's badges
- **Auth**: Required
- **Response**: Array of user badges with earned dates

### POST `/badges/:id/award` 🔒
Award badge to user (admin only)
- **Auth**: Required
- **Response**: Badge
- **Notifications**: Creates notification for user

---

## 🔔 Notifications (`/notifications`)

### GET `/notifications` 🔒
Get all notifications for current user
- **Auth**: Required
- **Query Params**:
  - `unreadOnly` (optional): true/false
- **Response**: Array of notifications

### GET `/notifications/unread-count` 🔒
Get unread notifications count
- **Auth**: Required
- **Response**: `{ count: number }`

### PUT `/notifications/:id/read` 🔒
Mark notification as read
- **Auth**: Required
- **Response**: Success

### PUT `/notifications/read-all` 🔒
Mark all notifications as read
- **Auth**: Required
- **Response**: Success

---

## 🔍 Explore (`/explore`)

### GET `/explore/:category`
Get explore content by category
- **Params**:
  - `category`: opportunities, resources, articles, partners
- **Response**: Array of content items

---

## 💬 Chat (`/chat`)

### GET `/chat/conversations` 🔒
Get all conversations for current user
- **Auth**: Required
- **Response**: Array of conversations with last message and unread count

### GET `/chat/messages/:userId` 🔒
Get messages with a specific user
- **Auth**: Required
- **Response**: Array of messages

### POST `/chat/send` 🔒
Send a message
- **Auth**: Required
- **Body**: `SendMessageDto`
  - `receiverId` (required)
  - `content` (required)
- **Response**: Created message

### PUT `/chat/messages/:id/read` 🔒
Mark message as read
- **Auth**: Required
- **Response**: Success

---

## 👨‍💼 Admin (`/admin`)

### GET `/admin/statistics` 🔒
Get platform statistics
- **Auth**: Required (Admin/Moderator)
- **Response**: Statistics object

### GET `/admin/users` 🔒
Get all users (paginated)
- **Auth**: Required (Admin/Moderator)
- **Query Params**: `page`, `limit`, `search`
- **Response**: Paginated users

### GET `/admin/users/:id` 🔒
Get user by ID
- **Auth**: Required (Admin/Moderator)
- **Response**: User details

### PUT `/admin/users/:id` 🔒
Update user
- **Auth**: Required (Admin/Moderator)
- **Body**: User update data
- **Response**: Updated user

### PUT `/admin/users/:id/role` 🔒
Update user role
- **Auth**: Required (Admin only)
- **Body**: `{ role: UserRole }`
- **Response**: Updated user

### DELETE `/admin/users/:id` 🔒
Delete user
- **Auth**: Required (Admin only)
- **Response**: Success

### GET `/admin/clubs` 🔒
Get all clubs (paginated)
- **Auth**: Required (Admin/Moderator)
- **Query Params**: `page`, `limit`
- **Response**: Paginated clubs

### PUT `/admin/clubs/:id` 🔒
Update club
- **Auth**: Required (Admin/Moderator)
- **Body**: Club update data
- **Response**: Updated club

### DELETE `/admin/clubs/:id` 🔒
Delete club
- **Auth**: Required (Admin/Moderator)
- **Response**: Success

### GET `/admin/events` 🔒
Get all events (paginated)
- **Auth**: Required (Admin/Moderator)
- **Query Params**: `page`, `limit`
- **Response**: Paginated events

### PUT `/admin/events/:id` 🔒
Update event
- **Auth**: Required (Admin/Moderator)
- **Body**: Event update data
- **Response**: Updated event

### DELETE `/admin/events/:id` 🔒
Delete event
- **Auth**: Required (Admin/Moderator)
- **Response**: Success

### GET `/admin/badges` 🔒
Get all badges
- **Auth**: Required (Admin/Moderator)
- **Response**: Array of badges

### POST `/admin/badges` 🔒
Create badge
- **Auth**: Required (Admin/Moderator)
- **Body**: Badge data
- **Response**: Created badge

### PUT `/admin/badges/:id` 🔒
Update badge
- **Auth**: Required (Admin/Moderator)
- **Body**: Badge update data
- **Response**: Updated badge

### DELETE `/admin/badges/:id` 🔒
Delete badge
- **Auth**: Required (Admin/Moderator)
- **Response**: Success

---

## 📚 API Documentation

Swagger UI available at: `http://localhost:8000/api`

---

## 🔑 Role-Based Access

- **MEMBER**: Default role, can access most endpoints
- **MODERATOR**: Can manage content (clubs, events, badges)
- **ADMIN**: Full access including user management

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Pagination uses `page` and `limit` query parameters
- All protected routes require JWT authentication
- Notifications are automatically created for:
  - Club joins
  - Event RSVPs
  - Mentorship requests/acceptances
  - Badge awards
