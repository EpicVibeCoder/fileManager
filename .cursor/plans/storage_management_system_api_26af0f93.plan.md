---
name: Storage Management System API
overview: Build a modular Node.js/Express.js/MongoDB REST API for a storage management system with authentication (local + Google OAuth), file management (PDF, images, DOC), folder organization, secret vault, calendar view, and storage tracking.
todos: []
---

# Storage Management System API - Implementation Plan

## Architecture Overview

The system will follow a modular design pattern with clear separation of concerns:

```
src/
├── config/          # Configuration files (DB, Passport, etc.)
├── models/          # MongoDB schemas
├── routes/          # Express route handlers
├── controllers/     # Business logic
├── middleware/      # Custom middleware (auth, validation, etc.)
├── services/        # Service layer (file operations, storage calculations)
├── utils/           # Helper functions
└── uploads/         # File storage directory (local filesystem)
```

## Technology Stack

- **Runtime**: Node.js (latest LTS)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js (local strategy + Google OAuth 2.0)
- **File Storage**: Local filesystem (free, no cloud costs)
- **Validation**: express-validator
- **Security**: bcrypt, jsonwebtoken, helmet, express-rate-limit

## Core Modules

### 1. Authentication Module (`src/routes/auth.js`, `src/controllers/authController.js`)

**Endpoints:**

- `POST /api/auth/signup` - User registration (email, password, confirmPassword, agreement checkbox)
- `POST /api/auth/login` - Local login
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)
- `PUT /api/auth/profile` - Edit username
- `POST /api/auth/logout` - Logout

**Models:** `User` schema with email, password (hashed), username, storageUsed, agreementAccepted, etc.

### 2. File Management Module (`src/routes/files.js`, `src/controllers/fileController.js`)

**Endpoints:**

- `POST /api/files/upload` - Upload file (PDF, image, DOC/DOCX)
- `GET /api/files` - List all files with filters (type, folder, etc.)
- `GET /api/files/:id` - Get file details
- `GET /api/files/:id/download` - Download file
- `PUT /api/files/:id/rename` - Rename file/folder
- `POST /api/files/:id/duplicate` - Duplicate file
- `POST /api/files/:id/copy` - Copy file
- `DELETE /api/files/:id` - Delete file/folder
- `POST /api/files/:id/favorite` - Add to favorites
- `DELETE /api/files/:id/favorite` - Remove from favorites

**File Types Supported:**

- PDF: `.pdf`
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Documents: `.doc`, `.docx`

**Models:** `File` schema with name, type, size, path, userId, folderId, isFavorite, isVault, createdAt, etc.

### 3. Folder Management Module (`src/routes/folders.js`, `src/controllers/folderController.js`)

**Endpoints:**

- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `GET /api/folders/:id/files` - Get files in folder
- `PUT /api/folders/:id/rename` - Rename folder
- `DELETE /api/folders/:id` - Delete folder (and contents)

**Models:** `Folder` schema with name, userId, parentId, createdAt, etc.

### 4. Storage & Statistics Module (`src/routes/storage.js`, `src/controllers/storageController.js`)

**Endpoints:**

- `GET /api/storage/usage` - Get storage usage (total, used, remaining)
- `GET /api/storage/statistics` - Get statistics by type (count, size per type)

**Service:** `src/services/storageService.js` - Calculate storage usage, validate limits (15GB max)

### 5. Dashboard Module (`src/routes/dashboard.js`, `src/controllers/dashboardController.js`)

**Endpoints:**

- `GET /api/dashboard/recent` - Get 5 most recent items (files + folders)

### 6. Secret Vault Module (`src/routes/vault.js`, `src/controllers/vaultController.js`)

**Endpoints:**

- `POST /api/vault/verify-pin` - Verify vault PIN
- `GET /api/vault/items` - Get vault items (requires PIN verification)
- `POST /api/files/:id/move-to-vault` - Move file to vault
- `POST /api/vault/set-pin` - Set/update vault PIN

**Models:** `VaultPin` schema with userId, hashedPin

**Middleware:** `verifyVaultPin` - Check PIN before accessing vault items

### 7. Calendar View Module (`src/routes/calendar.js`, `src/controllers/calendarController.js`)

**Endpoints:**

- `GET /api/calendar/:date` - Get all items uploaded/created on specific date (YYYY-MM-DD format)

### 8. Favorites Module (`src/routes/favorites.js`, `src/controllers/favoriteController.js`)

**Endpoints:**

- `GET /api/favorites` - Get all favorite items
- `POST /api/favorites/:id` - Add to favorites
- `DELETE /api/favorites/:id` - Remove from favorites

## Key Implementation Details

### File Storage Strategy

- Store files in `uploads/{userId}/{type}/` directory structure
- Store file metadata in MongoDB
- Validate file size before upload (check against 15GB limit)
- Update user's `storageUsed` field on upload/delete

### Authentication Flow

- JWT tokens for session management
- Passport local strategy for email/password
- Passport Google OAuth 2.0 strategy
- Password reset via email token (stored in User model with expiry)

### Storage Calculation

- Track `storageUsed` in User model
- Calculate on upload: `storageUsed += file.size`
- Calculate on delete: `storageUsed -= file.size`
- Validate before upload: `storageUsed + newFile.size <= 15GB`

### Secret Vault

- Files/folders have `isVault: true` flag
- PIN stored as bcrypt hash in `VaultPin` model
- Middleware verifies PIN before returning vault items
- Vault items count toward 15GB limit

### File Operations

- **Copy**: Create new file entry pointing to same physical file (or copy file)
- **Duplicate**: Auto-generate name like `filename_copy.pdf`
- **Rename**: Update name in database and filesystem
- **Delete**: Remove from filesystem and database, update storage

## Database Schema Design

### User Model

```javascript
{
  email: String (unique, required),
  password: String (hashed),
  username: String,
  storageUsed: Number (default: 0),
  storageLimit: Number (default: 15GB),
  agreementAccepted: Boolean,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  googleId: String,
  createdAt: Date
}
```

### File Model

```javascript
{
  name: String,
  type: String (enum: ['pdf', 'image', 'doc']),
  size: Number,
  path: String,
  userId: ObjectId (ref: User),
  folderId: ObjectId (ref: Folder, optional),
  isFavorite: Boolean (default: false),
  isVault: Boolean (default: false),
  mimeType: String,
  createdAt: Date
}
```

### Folder Model

```javascript
{
  name: String,
  userId: ObjectId (ref: User),
  parentId: ObjectId (ref: Folder, optional),
  isVault: Boolean (default: false),
  createdAt: Date
}
```

### VaultPin Model

```javascript
{
  userId: ObjectId (ref: User, unique),
  hashedPin: String,
  createdAt: Date
}
```

## Security Considerations

- Password hashing with bcrypt (salt rounds: 10)
- JWT tokens with expiration
- Rate limiting on auth endpoints
- File type validation (whitelist extensions)
- File size validation
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator

## API Response Format

Standardized responses:

```json
{
  "success": true/false,
  "message": "Description",
  "data": {},
  "error": {}
}
```

## Testing Strategy

- Postman collection with all endpoints
- Test scenarios:
  - Authentication flows
  - File upload/download
  - Storage limit enforcement
  - Vault PIN protection
  - Calendar view filtering
  - Statistics accuracy

## Implementation Phases

The project will be built in phases, with Postman testing after each phase completion:

### Phase 1: Project Setup & Foundation

**Goal:** Initialize project structure and basic server setup

**Tasks:**

- Initialize Node.js project with `package.json`
- Install core dependencies (express, mongoose, dotenv, etc.)
- Create project folder structure (`src/` with subdirectories)
- Setup Express server with basic middleware (body-parser, cors, helmet)
- Configure MongoDB connection
- Create `.env.example` and `.gitignore`
- Setup error handling middleware
- Create standardized API response utility

**Deliverables:**

- Running Express server
- MongoDB connection established
- Basic health check endpoint (`GET /api/health`)

**Postman Tests:**

- Health check endpoint
- Server connectivity

---

### Phase 2: User Authentication (Local)

**Goal:** Implement local authentication (signup, login, logout)

**Tasks:**

- Create User model with required fields
- Implement password hashing with bcrypt
- Create authentication routes (`/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`)
- Implement JWT token generation and verification middleware
- Add input validation (express-validator) for signup/login
- Create auth controller with business logic
- Add authentication middleware (`authenticateToken`)

**Deliverables:**

- User can signup with email, password, confirmPassword, agreement checkbox
- User can login and receive JWT token
- User can logout
- Protected routes require valid JWT token

**Postman Tests:**

- `POST /api/auth/signup` - Test validation, duplicate email, agreement checkbox
- `POST /api/auth/login` - Test valid/invalid credentials
- `POST /api/auth/logout` - Test token invalidation
- Test JWT token protection on sample protected route

---

### Phase 3: User Profile Management

**Goal:** User profile operations (edit username, change password, forgot password)

**Tasks:**

- Implement `PUT /api/auth/profile` - Edit username
- Implement `POST /api/auth/change-password` - Change password (authenticated)
- Implement `POST /api/auth/forgot-password` - Generate reset token
- Implement `POST /api/auth/reset-password` - Reset password with token
- Add validation for all profile endpoints
- Update User model with reset token fields

**Deliverables:**

- User can edit username
- User can change password (when authenticated)
- User can request password reset
- User can reset password with valid token

**Postman Tests:**

- `PUT /api/auth/profile` - Update username
- `POST /api/auth/change-password` - Change password with old password
- `POST /api/auth/forgot-password` - Request reset token
- `POST /api/auth/reset-password` - Reset with token (test expiry)

---

### Phase 4: Google OAuth Authentication

**Goal:** Implement Google OAuth 2.0 authentication

**Tasks:**

- Install and configure Passport.js with Google OAuth 2.0 strategy
- Create Google OAuth routes (`GET /api/auth/google`, `GET /api/auth/google/callback`)
- Handle OAuth callback and user creation/login
- Update User model to support `googleId` field
- Handle both local and Google-authenticated users

**Deliverables:**

- User can initiate Google OAuth flow
- User can authenticate via Google
- Google-authenticated users can access all features

**Postman Tests:**

- `GET /api/auth/google` - Initiate OAuth (redirect test)
- `GET /api/auth/google/callback` - Complete OAuth flow
- Test login with Google-authenticated account

---

### Phase 5: File Upload & Basic File Management

**Goal:** Core file upload and retrieval functionality

**Tasks:**

- Create File model with all required fields
- Setup multer for file uploads
- Implement file type validation (PDF, images, DOC/DOCX)
- Create upload directory structure (`uploads/{userId}/{type}/`)
- Implement `POST /api/files/upload` - Upload file
- Implement `GET /api/files` - List files with filters (type, folder)
- Implement `GET /api/files/:id` - Get file details
- Implement `GET /api/files/:id/download` - Download file
- Create storage service to calculate and validate storage limits (15GB)
- Update User model `storageUsed` on upload

**Deliverables:**

- User can upload PDF, image, and DOC files
- Files are stored in organized directory structure
- User can list and filter files by type
- User can download files
- Storage limit (15GB) is enforced
- Storage usage is tracked

**Postman Tests:**

- `POST /api/files/upload` - Upload each file type (PDF, image, DOC)
- `GET /api/files` - List all files, filter by type
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- Test storage limit enforcement (upload beyond 15GB)
- Test invalid file type rejection

---

### Phase 6: Folder Management

**Goal:** Create and manage folders

**Tasks:**

- Create Folder model
- Implement `POST /api/folders` - Create folder
- Implement `GET /api/folders` - List folders
- Implement `GET /api/folders/:id/files` - Get files in folder
- Implement `PUT /api/folders/:id/rename` - Rename folder
- Implement `DELETE /api/folders/:id` - Delete folder (and contents)
- Update File model to support `folderId` reference
- Add folder filtering to file listing

**Deliverables:**

- User can create folders with custom names
- User can list all folders
- User can view files within a folder
- User can rename folders
- User can delete folders (and nested contents)
- Files can be organized in folders

**Postman Tests:**

- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `GET /api/folders/:id/files` - Get folder contents
- `PUT /api/folders/:id/rename` - Rename folder
- `DELETE /api/folders/:id` - Delete folder
- Test uploading files to folders

---

### Phase 7: File Operations (Rename, Duplicate, Copy, Delete)

**Goal:** Advanced file operations

**Tasks:**

- Implement `PUT /api/files/:id/rename` - Rename file
- Implement `POST /api/files/:id/duplicate` - Duplicate file (auto-name: `filename_copy.ext`)
- Implement `POST /api/files/:id/copy` - Copy file
- Implement `DELETE /api/files/:id` - Delete file
- Update storage calculations on delete
- Handle file system operations (rename, copy, delete physical files)

**Deliverables:**

- User can rename files and folders
- User can duplicate files
- User can copy files
- User can delete files and folders
- Storage is updated correctly on delete

**Postman Tests:**

- `PUT /api/files/:id/rename` - Rename file
- `POST /api/files/:id/duplicate` - Duplicate file
- `POST /api/files/:id/copy` - Copy file
- `DELETE /api/files/:id` - Delete file
- Verify storage updates after delete

---

### Phase 8: Favorites System

**Goal:** Favorite/unfavorite items

**Tasks:**

- Update File and Folder models with `isFavorite` field
- Implement `POST /api/files/:id/favorite` - Add to favorites
- Implement `DELETE /api/files/:id/favorite` - Remove from favorites
- Implement `GET /api/favorites` - Get all favorite items
- Add favorite filtering to file/folder listings

**Deliverables:**

- User can mark files and folders as favorites
- User can view all favorite items
- User can unfavorite items

**Postman Tests:**

- `POST /api/files/:id/favorite` - Add file to favorites
- `POST /api/folders/:id/favorite` - Add folder to favorites
- `GET /api/favorites` - List all favorites
- `DELETE /api/files/:id/favorite` - Remove from favorites

---

### Phase 9: Storage Statistics & Dashboard

**Goal:** Storage usage tracking and dashboard

**Tasks:**

- Create storage service for calculations
- Implement `GET /api/storage/usage` - Get storage usage (total, used, remaining)
- Implement `GET /api/storage/statistics` - Get statistics by type (count, size per type)
- Implement `GET /api/dashboard/recent` - Get 5 most recent items (files + folders)
- Aggregate statistics from File and Folder collections

**Deliverables:**

- User can view total storage usage and remaining space
- User can view statistics per file type (count, total size)
- Dashboard shows 5 most recent items

**Postman Tests:**

- `GET /api/storage/usage` - Get storage metrics
- `GET /api/storage/statistics` - Get type-wise statistics
- `GET /api/dashboard/recent` - Get recent items
- Verify statistics accuracy after uploads/deletes

---

### Phase 10: Secret Vault

**Goal:** PIN-protected secret vault

**Tasks:**

- Create VaultPin model
- Implement `POST /api/vault/set-pin` - Set/update vault PIN
- Implement `POST /api/vault/verify-pin` - Verify vault PIN
- Create vault PIN verification middleware
- Implement `GET /api/vault/items` - Get vault items (requires PIN)
- Implement `POST /api/files/:id/move-to-vault` - Move file to vault
- Update File and Folder models to support `isVault` flag
- Ensure vault items count toward 15GB limit

**Deliverables:**

- User can set vault PIN
- User can verify PIN to access vault
- User can move files/folders to vault
- Vault items are PIN-protected
- Vault storage counts toward total limit

**Postman Tests:**

- `POST /api/vault/set-pin` - Set vault PIN
- `POST /api/vault/verify-pin` - Verify PIN (correct/incorrect)
- `POST /api/files/:id/move-to-vault` - Move file to vault
- `GET /api/vault/items` - Access vault (with/without PIN)
- Test PIN protection enforcement

---

### Phase 11: Calendar View

**Goal:** Date-based item viewing

**Tasks:**

- Implement `GET /api/calendar/:date` - Get items by date (YYYY-MM-DD format)
- Query files and folders by `createdAt` date
- Return combined list of files and folders created on specific date
- Handle date parsing and validation

**Deliverables:**

- User can view all items (files + folders) uploaded/created on a specific date
- Date format: YYYY-MM-DD

**Postman Tests:**

- `GET /api/calendar/:date` - Get items for specific date
- Test with various dates (with/without items)
- Test date format validation

---

### Phase 12: Final Integration & Postman Collection

**Goal:** Complete integration, testing, and documentation

**Tasks:**

- Review all endpoints for consistency
- Complete Postman collection with all endpoints
- Add environment variables to Postman collection
- Create comprehensive README.md with API documentation
- Test all edge cases
- Verify storage calculations across all operations
- Test authentication flows end-to-end
- Performance testing (if needed)

**Deliverables:**

- Complete Postman collection JSON file
- All endpoints tested and working
- README.md with setup instructions and API documentation
- Project ready for submission

**Postman Tests:**

- Complete end-to-end user flows
- All endpoints in collection
- Test error scenarios
- Verify all requirements met

---

## Phase Testing Checklist

After each phase, verify:

- [ ] All endpoints in phase are functional
- [ ] Input validation works correctly
- [ ] Error handling is proper
- [ ] Authentication/authorization works (where applicable)
- [ ] Database operations are correct
- [ ] Storage calculations are accurate (Phases 5+)
- [ ] Postman tests pass
- [ ] No breaking changes to previous phases

## Project Structure Files

- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules
- `server.js` - Entry point
- `README.md` - Setup and API documentation
- `postman_collection.json` - Postman collection for testing