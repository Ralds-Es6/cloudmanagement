# CloudXen - Cloud Document Management System

A cloud-based document management system that allows users to upload, download, preview, star, share, and organize files and nested folders inspired by Google Drive. Built with a decoupled **MERN stack**, **Tailwind CSS**, **MongoDB Atlas** (with offline local fallback), **Cloudflare R2** object storage, **Cloudflare Turnstile** bot verification, and **Google OAuth 2.0**.

---

## 🏗 Decoupled Architecture

Frontend and Backend are completely separated, each maintaining their own independent dependencies (`node_modules`), package configurations, and environments:

```text
DOCUMENT-MANAGEMENT/
├── backend/                  # Independent Express.js API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js         # MongoDB Atlas connection with offline fallback
│   │   │   └── r2.js         # Cloudflare R2 client (@aws-sdk/client-s3)
│   │   ├── controllers/      # Auth, documents, folders, settings, share controllers
│   │   ├── middlewares/      # JWT auth, error handlers, multer upload
│   │   ├── models/           # User, Document, Folder, SystemSetting models
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # R2 object storage & Turnstile services
│   │   ├── app.js            # Express app configuration & middlewares
│   │   └── server.js         # Server entry point & port listener
│   ├── .env.example          # Environment variables template
│   ├── .gitignore
│   └── package.json
│
├── frontend/                 # Independent Vite + React Application
│   ├── src/
│   │   ├── components/       # Reusable UI components & modals
│   │   ├── context/          # AuthContext (JWT + Google OAuth)
│   │   ├── layouts/          # Responsive AppLayout with sidebar
│   │   ├── pages/            # My Files, Favorites, Shared, Recents, Trash, Admin
│   │   ├── services/         # Axios API service
│   │   ├── App.jsx           # Application routing & protected routes
│   │   ├── index.css         # Tailwind CSS styling
│   │   └── main.jsx
│   ├── public/
│   │   └── _redirects        # SPA route redirects for production hosting
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   └── vite.config.js
│
├── .gitignore                # Global gitignore protecting .env and node_modules
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
cp .env.example .env          # Fill in your MongoDB URI, Cloudflare R2, Turnstile, and Google OAuth credentials
npm install                   # Installs backend dependencies
npm run dev                   # Runs Express server at http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env          # Fill in your API URL, Turnstile site key, and Google Client ID
npm install                   # Installs frontend dependencies
npm run dev                   # Runs Vite dev server at http://localhost:5173
```

---

## 🔒 Security & Features

- **Decoupled Object Storage**: Real document binaries (PDFs, images, etc.) are stored in **Cloudflare R2** while **MongoDB Atlas** only stores lightweight JSON metadata.
- **Bot Protection**: Protected with **Cloudflare Turnstile** on login portals.
- **Authentication**: Dual-path authentication supporting standard password hashing (bcrypt) and **Google OAuth 2.0 (Identity Services)**.
- **Admin Isolation**: Strict security separation between User Portal and Admin Console.
- **Hierarchical Folders & Favorites**: Nested subfolder navigation with clickable breadcrumb trails.
