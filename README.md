# Storage Management API

A robust Node.js API for secure file storage, implementing folder management, file operations, Favorites, Dashboard, a secure Vault, and Calendar integration.

## 🚀 Getting Started (Docker) - Recommended

The easiest way to run the application is using Docker. This ensures all dependencies (Node.js, MongoDB) are set up correctly.

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed and running.

### Installation

1.    **Configure Environment Variables**:
      Copy the example environment file to create your local configuration:

      ```bash
      cp .env.example .env
      ```

      Open `.env` and fill in your details:
      - **Google OAuth**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Required for Phase 4)
      - **Email (SMTP)**: `SMTP_USER`, `SMTP_PASS` (Required for OTP/Password Reset)

2.    **Run with Docker**:
      Build and start the containers:

      ```bash
      docker compose up --build
      ```

3.    **Access the API**:
      The server will be running at `http://localhost:8080`.
      MongoDB will be running at `mongodb://localhost:27017/filemanager`.

---

## 🛠️ Manual Setup (Local Node.js)

If you prefer to run the application without Docker:

### Prerequisites

- Node.js (Latest LTS)
- MongoDB installed and running locally.

### Installation

1.    **Install Dependencies**:

      ```bash
      npm install
      ```

2.    **Configure Environment**:
      - Copy `.env.example` to `.env`.
      - Update `MONGODB_URI` if your local MongoDB is not at the default address.

3.    **Start the Server**:
      ```bash
      npm start
      # OR for development with auto-reload:
      npm run dev
      ```

---

## 🧪 API Documentation & Testing

A comprehensive **Postman Collection** is included in this repository (`postman_collection.json`).

### Importing into Postman

1.    Open Postman.
2.    Click **Import** -> **File** -> Select `postman_collection.json`.
3.    The collection "Storage Management API" will appear.

### Testing Workflow

The collection is organized into **Phases** meant to be tested sequentially:

1.    **Phase 1: Foundation**: Verify server health.
2.    **Phase 2: Authentication**: Signup/Login (Automatically captures tokens).
3.    **Phase 3: User Profile**: Test profile updates and Password Reset (OTP flow).
4.    **Phase 4: Google OAuth**: Instructions included in the request description.
5.    **Phase 5-9**: File & Folder operations, Favorites, Dashboard.
6.    **Phase 10: Vault**: Test secure file storage with PIN.
7.    **Phase 11: Calendar**: **NEW** - Get files by date.
      - Set `custom_calendar_date` variable (e.g., `25-12-23`) to test specific dates.

### Collection Variables

The collection uses scripts to automatically manage variables like `auth_token`, `file_id`, etc. You rarely need to set these manually.

## 🔑 Environment Variables

| Variable               | Description                                 |
| ---------------------- | ------------------------------------------- |
| `PORT`                 | Server port (default: 8080)                 |
| `MONGODB_URI`          | MongoDB connection string                   |
| `JWT_SECRET`           | Secret key for signing JsonWebTokens        |
| `GOOGLE_CLIENT_ID`     | OAuth Client ID from Google Cloud Console   |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret                         |
| `SMTP_HOST`            | SMTP Server (e.g., smtp.gmail.com)          |
| `SMTP_USER`            | Email address for sending system emails     |
| `SMTP_PASS`            | App Password (not login password) for email |
