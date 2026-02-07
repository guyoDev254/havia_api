# Comment Reactions Implementation

## Problem
The frontend was trying to call `/posts/comments/{commentId}/react` endpoint, but it didn't exist on the backend, causing 404 errors.

## Solution
Added complete comment reaction functionality to match post reactions.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
- Added `CommentReaction` model with:
  - `id`, `commentId`, `userId`, `type` (default "LIKE"), `createdAt`
  - Unique constraint on `[commentId, userId]` to prevent duplicate reactions
  - Relations to `Comment` and `User` models
- Updated `Comment` model to include `reactions` relation
- Updated `User` model to include `commentReactions` relation

### 2. API Controller (`src/posts/posts.controller.ts`)
- Added `POST /posts/comments/:id/react` endpoint
- Requires authentication (`@UseGuards(JwtAuthGuard)`)
- Accepts `type` query parameter (only 'LIKE' supported for comments)

### 3. Service Layer (`src/posts/posts.service.ts`)
- Added `reactToComment()` method that:
  - Validates comment exists and is not deleted
  - Checks for existing reaction
  - Removes reaction if exists (unlike)
  - Creates reaction if doesn't exist (like)
  - Sends notification to comment author (if not own comment)
- Updated `getComments()` to include:
  - Reaction count (`_count.reactions`)
  - User's reactions (if authenticated)
- Updated `findOne()` post query to include comment reactions

## Database Migration Required

After these changes, you need to:
1. Generate Prisma migration: `npx prisma migrate dev --name add_comment_reactions`
2. Or apply migration: `npx prisma migrate deploy` (for production)

## API Endpoint

**POST** `/posts/comments/:id/react?type=LIKE`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "reacted": true,
  "type": "LIKE"
}
```

Or when unliking:
```json
{
  "reacted": false,
  "type": null
}
```

## Testing

1. Like a comment - should return `{ reacted: true, type: "LIKE" }`
2. Unlike a comment - should return `{ reacted: false, type: null }`
3. Check comment reactions are included in comment queries
4. Verify notifications are sent to comment authors
