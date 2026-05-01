# 🚀 TaskFlow — Team Task Manager

A full-stack Team Task Manager with role-based access control (Admin/Member), built with Node.js, Express, SQLite, and vanilla JS.

## ✨ Features

### Authentication
- JWT-based signup & login
- Secure password hashing (bcrypt)
- 7-day token expiry
- First registered user automatically becomes Admin

### Role-Based Access
| Feature | Admin | Member |
|---|---|---|
| Create projects | ✅ | ❌ |
| Edit/delete projects | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ |
| Edit any task | ✅ | ❌ |
| Manage team members | ✅ | ❌ |
| View all projects | ✅ | Projects they belong to |

### Project Management
- Create, edit, delete projects
- Project status: Active / Completed / Archived
- Progress bar (tasks done/total)
- Member management per project

### Task Management
- Kanban board (To Do / In Progress / Done)
- Priority levels: Low / Medium / High
- Due date tracking with overdue detection
- Task assignment to team members
- Filtering by project, status, priority

### Dashboard
- Live stats: total tasks, my tasks, in progress, done, overdue, projects
- My assigned tasks quick view
- Overdue tasks alert panel

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3) — no setup required
- **Auth**: JWT + bcryptjs
- **Frontend**: Vanilla JS SPA (no build step)
- **Deployment**: Railway

## 🚦 Local Development

```bash
# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# OR start production
npm start
```

App runs at `http://localhost:3000`

## 🌐 Deploy on Railway

### Method 1: GitHub (Recommended)
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects Node.js and deploys
5. Add environment variables (optional):
   - `JWT_SECRET` — a long random string (important for production!)
   - `PORT` — Railway sets this automatically

### Method 2: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables
```
JWT_SECRET=your_super_secret_key_here_make_it_long
PORT=3000
DB_PATH=/data/taskmanager.db  # Optional: persist DB to Railway volume
```

### Persistent Storage on Railway
For persistent data, add a Railway Volume:
1. In Railway dashboard → your service → Volumes
2. Mount path: `/data`
3. Set env var: `DB_PATH=/data/taskmanager.db`

## 📁 Project Structure

```
├── server.js           # Express app entry point
├── database.js         # SQLite schema & connection
├── middleware/
│   └── auth.js         # JWT authentication middleware
├── routes/
│   ├── auth.js         # /api/auth (login, signup, me)
│   ├── projects.js     # /api/projects (CRUD + members)
│   ├── tasks.js        # /api/tasks (CRUD + dashboard)
│   └── users.js        # /api/users (CRUD + roles)
├── public/
│   ├── index.html      # SPA shell
│   ├── style.css       # Dark industrial design
│   └── app.js          # Frontend SPA logic
├── railway.json        # Railway deploy config
├── nixpacks.toml       # Build config
└── package.json
```

## 🔌 API Reference

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | `{name, email, password, role}` | Register |
| POST | `/api/auth/login` | `{email, password}` | Login |
| GET | `/api/auth/me` | — | Current user |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List all accessible projects |
| POST | `/api/projects` | Create project (admin) |
| GET | `/api/projects/:id` | Get project with members |
| PATCH | `/api/projects/:id` | Update project (admin) |
| DELETE | `/api/projects/:id` | Delete project (admin) |
| POST | `/api/projects/:id/members` | Add member (admin) |
| DELETE | `/api/projects/:id/members/:userId` | Remove member (admin) |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (filterable) |
| GET | `/api/tasks/dashboard` | Stats summary |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

**Task filters**: `?project_id=&status=&assignee_id=&priority=&overdue=true`

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all users |
| PATCH | `/api/users/:id/role` | Change role (admin) |
| DELETE | `/api/users/:id` | Remove user (admin) |

## 📹 Demo Flow (for video)

1. Sign up as Admin → explore dashboard
2. Create a project
3. Add tasks with different priorities & due dates
4. Sign up as Member in incognito → show limited access
5. Assign tasks from admin → member sees them
6. Move tasks through Kanban (To Do → In Progress → Done)
7. Show overdue detection on dashboard
8. Admin → Team page → change role
