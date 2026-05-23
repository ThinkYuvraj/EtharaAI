Team Task Manager

Team Task Manager is a full-stack web application developed to help teams organize projects, assign tasks, monitor progress, and manage collaboration efficiently through a centralized workspace. The application includes secure user authentication, project membership management, task assignment, task status tracking, dashboard analytics, and role-based access control.

--------------------------------------------------

LIVE DEPLOYMENT

Frontend Application
https://etharai-frontend.up.railway.app/login

Backend API
https://etharaai-mongodb.up.railway.app/

Railway Project Dashboard
https://railway.com/project/73cea88c-3ed5-4955-ac83-524e6f2c459f/service/7b0a13da-662e-418d-8b6a-7cb738ca880b?environmentId=b0dc39cf-ff1f-492a-b93e-1eaed0f38ce4

--------------------------------------------------

PROJECT OVERVIEW

The system consists of two independent applications:

1. team-task-manager-frontend
Built using React, TypeScript, and Vite for the client-side application.

2. team-task-manager-backend
Built using Express.js, TypeScript, MongoDB, and Mongoose for the REST API backend.

The frontend communicates with the backend through HTTP API requests. During local development, the frontend runs on http://127.0.0.1:5173 while the backend runs on http://localhost:5000.

--------------------------------------------------

CORE FEATURES

USER AUTHENTICATION

- User registration with name, email, and password
- Secure login using JWT authentication
- Protected API routes
- Persistent login using browser local storage
- Authenticated user session refresh using /api/auth/me
- Logout functionality

ROLE MANAGEMENT

- Support for admin and member roles
- Automatic assignment of the first registered user as administrator
- Global administrator access across projects and tasks
- Project-level role management

PROJECT MANAGEMENT

- Create and manage projects
- Update project details
- Delete projects when authorized
- Add and remove project members
- Assign project roles
- Restrict removal of project creators

TASK MANAGEMENT

- Create tasks under projects
- Assign tasks to project members
- Manage task priority levels:
  - Low
  - Medium
  - High
  - Urgent
- Update task status:
  - Pending
  - In Progress
  - Completed
- Edit and delete tasks based on permissions
- Search and filter tasks

DASHBOARD

- Display project statistics
- Show completed, pending, and in-progress tasks
- Display recent activity logs
- Track project progress
- Support project-specific task views

USER INTERFACE

- Responsive design
- Protected dashboard routes
- Light and dark mode support
- Client-side routing using React Router

--------------------------------------------------

TECHNOLOGY STACK

FRONTEND

- React
- TypeScript
- Vite
- React Router
- TanStack React Query
- Axios

BACKEND

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- bcryptjs
- Zod
- dotenv
- CORS

--------------------------------------------------

FOLDER STRUCTURE

.
├── README.md
├── team-task-manager-backend
│   ├── src
│   │   ├── index.ts
│   │   ├── lib
│   │   ├── middleware
│   │   ├── models
│   │   └── routes
│   ├── package.json
│   └── tsconfig.json
│
└── team-task-manager-frontend
    ├── src
    │   ├── auth
    │   ├── pages
    │   ├── ui
    │   ├── App.tsx
    │   └── frontend-api.ts
    ├── package.json
    └── vite.config.ts

--------------------------------------------------

ENVIRONMENT CONFIGURATION

Backend Environment Variables

PORT=5000
CORS_ORIGIN=https://frontend-production-0b59f.up.railway.app
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

Frontend Environment Variables

VITE_API_BASE=https://compassionate-dream-production-18ff.up.railway.app

--------------------------------------------------

FRONTEND API CONFIGURATION

export const API_BASE =
  import.meta.env.VITE_API_BASE ??
  'https://compassionate-dream-production-18ff.up.railway.app';

--------------------------------------------------

INSTALLATION

Install Backend Dependencies

cd team-task-manager-backend
npm install

Install Frontend Dependencies

cd team-task-manager-frontend
npm install

--------------------------------------------------

RUNNING THE APPLICATION

Start Backend

cd team-task-manager-backend
npm run dev

Backend runs on:
http://localhost:5000

Start Frontend

cd team-task-manager-frontend
npm run dev

Frontend runs on:
http://127.0.0.1:5173

--------------------------------------------------

AVAILABLE SCRIPTS

BACKEND

npm run dev
Runs the backend in development mode using TypeScript.

npm run build
Compiles the backend TypeScript source into the dist directory.

npm start
Runs the compiled backend application from dist/index.js.

FRONTEND

npm run dev
Runs the Vite development server.

npm run build
Builds the frontend for production.

npm run lint
Runs ESLint for the frontend codebase.

npm run preview
Serves the production frontend build locally for preview.

--------------------------------------------------

API ENDPOINTS

SYSTEM ROUTES

GET /
Returns API information and available endpoint groups.

GET /health
Returns backend health status.

AUTHENTICATION ROUTES

POST /api/auth/signup
Registers a new user.

POST /api/auth/login
Authenticates an existing user.

GET /api/auth/me
Returns the authenticated user profile.

GET /api/auth/users
Returns searchable user records for assignment and membership workflows.

PROJECT ROUTES

GET /api/projects
Lists accessible projects.

POST /api/projects
Creates a new project.

PATCH /api/projects/:projectId
Updates a project.

DELETE /api/projects/:projectId
Deletes a project and its tasks.

POST /api/projects/:projectId/members
Adds or updates a project member.

PATCH /api/projects/:projectId/members/:userId
Updates a member role.

DELETE /api/projects/:projectId/members/:userId
Removes a member from a project.

TASK ROUTES

GET /api/tasks/dashboard
Returns dashboard summaries, task activity, and progress data.

GET /api/tasks
Lists tasks for a selected project.

POST /api/tasks
Creates a new task.

PATCH /api/tasks/:taskId
Updates task details or status.

DELETE /api/tasks/:taskId
Deletes a task.

--------------------------------------------------

BUILD VERIFICATION

cd team-task-manager-backend
npm run build

cd team-task-manager-frontend
npm run build

These commands verify that both applications compile successfully.

--------------------------------------------------

SECURITY NOTES

- Store sensitive configuration in environment variables
- Keep real .env files out of public repositories
- Use a strong JWT_SECRET for non-local environments
- Restrict CORS_ORIGIN to trusted frontend domains in production
- Use a secured MongoDB connection string with appropriate user permissions

--------------------------------------------------

HEALTH CHECK

GET https://compassionate-dream-production-18ff.up.railway.app/health

--------------------------------------------------

REPOSITORY STATUS

This README is intended for local project documentation, deployment setup, and repository presentation.
