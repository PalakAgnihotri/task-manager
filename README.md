# TaskFlow — Team Task Manager

A full-stack web app for managing projects, tasks, and teams with role-based access control.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Auth | JWT + bcryptjs |
| Frontend | React, TypeScript |
| Routing | React Router v6 |
| HTTP | Axios |
| Deploy | Railway |

---

## Features

- **Authentication** — Signup/Login with JWT; roles: Admin, Member
- **Projects** — Admin can create, update, delete projects; assign members
- **Tasks** — CRUD with status (Todo / In Progress / Done), priority (Low / Medium / High), due dates, assignment
- **Dashboard** — Stats, overdue tasks, task completion progress
- **Kanban View** — Visual drag-style columns per status
- **Role-based access** — Admins manage everything; members see/update only their tasks

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/         # DB connection
│   │   ├── controllers/    # auth, project, task, dashboard
│   │   ├── middleware/     # JWT protect, adminOnly, validate
│   │   ├── models/         # User, Project, Task
│   │   ├── routes/         # auth, projects, tasks, dashboard
│   │   ├── validators/     # Zod schemas
│   │   └── index.ts        # Express entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/            # Axios instance + API calls
    │   ├── components/     # Layout (sidebar)
    │   ├── context/        # AuthContext
    │   ├── pages/          # Login, Signup, Dashboard, Projects, ProjectDetail, Tasks
    │   ├── App.tsx
    │   ├── index.tsx
    │   └── styles.css
    └── package.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your MONGODB_URI and JWT_SECRET
npm install
npm run dev
# Runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
# Proxies /api/* to localhost:5000
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | None | Register |
| POST | `/api/auth/login` | None | Login |
| GET | `/api/auth/me` | Any | Get current user |
| GET | `/api/auth/users` | Admin | List all users |

### Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | Any | List projects |
| GET | `/api/projects/:id` | Member/Admin | Project detail |
| POST | `/api/projects` | Admin | Create project |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project + tasks |
| POST | `/api/projects/:id/members` | Admin | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tasks` | Any | List tasks (filterable) |
| GET | `/api/tasks/:id` | Any | Task detail |
| POST | `/api/tasks` | Any | Create task |
| PUT | `/api/tasks/:id` | Any | Update task |
| DELETE | `/api/tasks/:id` | Admin/Creator | Delete task |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | Any | Stats + overdue tasks |

---

## Deployment (Railway)

### Backend
1. Create new Railway project → New Service → GitHub Repo (backend folder)
2. Add environment variables:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_random_secret_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=5000
   ```
3. Railway auto-detects Node.js and runs `npm run build && npm start`

### Frontend
1. Add another service in same Railway project → GitHub Repo (frontend folder)
2. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-railway-url/api
   ```
3. Railway builds with `npm run build` and serves via `npx serve`

---

## Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create/Delete Projects | ✅ | ❌ |
| Add/Remove Members | ✅ | ❌ |
| Create Tasks | ✅ | ✅ (own projects) |
| Edit Any Task | ✅ | ❌ |
| Update Task Status (assigned) | ✅ | ✅ |
| Delete Tasks | ✅ | ✅ (own only) |
| View Dashboard | ✅ (all) | ✅ (own) |

---

## Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/taskflow
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```
