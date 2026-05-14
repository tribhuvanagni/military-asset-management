# KristalBall - Military Asset Management System

Internal tool for tracking military assets (vehicles, weapons, ammunition) across multiple bases with role-based access control and an approval workflow for inter-base transfers.

## Live Application

**Frontend** - https://military-asset-management-azure.vercel.app

**Backend API** - https://kristalball-api.onrender.com

> Note: Render free tier spins down after inactivity. First request may take 30-50 seconds to wake up.

## Stack

- **Frontend**: React 18 + React Router v6, hand-written CSS, Axios
- **Backend**: Node.js + Express, MongoDB + Mongoose, JWT auth
- **Database**: MongoDB Atlas (cloud-hosted)
- **Fonts**: IBM Plex Sans (body), Bebas Neue (headings)

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- MongoDB (local instance or Atlas)

### Backend

```bash
cd backend
cp ../.env.example .env    # then edit MONGO_URI / JWT_SECRET as needed
npm install
npm run seed               # populates initial users, assets, and sample data
npm run dev                # starts on port 5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # starts on port 5173
```

Open `http://localhost:5173` in a browser.

## Test Accounts

| Username    | Password   | Role               | Base         |
|-------------|------------|---------------------|--------------|
| admin       | Admin@123  | System Admin        | All bases    |
| cmd_alpha   | Base@001   | Base Commander      | Alpha Base   |
| log_bravo   | Log@002    | Logistics Officer   | Bravo Base   |

## Role Permissions

- **Admin** - Full access: all pages, all CRUD operations
- **Commander** - View dashboard, approve/reject transfers, manage assignments (own base only)
- **Logistics** - Record purchases, initiate transfers, read-only on assignments

## Features

- Dashboard with summary cards, filterable asset table, and net movement breakdown modal
- Purchase recording with automatic balance updates
- Transfer workflow: initiate > pending > approve/reject, with balance enforcement
- Assignment tracking with inline expenditure recording and return workflow
- JWT-based auth with role middleware on every protected endpoint
- Session expiry detection with auto-redirect to login

## Deployment

The app is deployed as two separate services:

### Backend (Render)

1. Created a Web Service on [Render](https://render.com) connected to the GitHub repo
2. Set the root directory to `backend`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Added environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`

### Frontend (Vercel)

1. Created a project on [Vercel](https://vercel.com) connected to the same GitHub repo
2. Set the root directory to `frontend`
3. Framework preset: Vite (auto-detected)
4. Added `VITE_API_URL` environment variable pointing to the Render backend
5. Vercel handles the build (`npm run build`) and serves the `dist/` output

### Database (MongoDB Atlas)

1. Created a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Added a database user with read/write access
3. Whitelisted all IPs (`0.0.0.0/0`) for Render connectivity
4. Ran `node seed.js` locally with the Atlas connection string to populate initial data

## Project Structure

```
backend/
├── index.js              # Express app + MongoDB connection
├── seed.js               # Database seeder with realistic data
├── middleware/auth.js     # JWT verification + role guard
├── models/               # Mongoose schemas
│   ├── User.js
│   ├── Asset.js
│   ├── Purchase.js
│   ├── Transfer.js
│   └── Assignment.js
└── routes/               # Express route handlers
    ├── auth.js
    ├── assets.js
    ├── purchases.js
    ├── transfers.js
    └── assignments.js

frontend/src/
├── main.jsx
├── App.jsx
├── index.css             # Global design tokens
├── services/api.js       # Axios instance with JWT interceptor
├── context/AuthContext.jsx
└── components/
    ├── ProtectedRoute.jsx
    ├── Login/
    ├── Sidebar/
    ├── Dashboard/
    ├── Purchases/
    ├── Transfers/
    ├── Assignments/
    └── shared/           # Modal, Toast, Spinner, EmptyState
```
