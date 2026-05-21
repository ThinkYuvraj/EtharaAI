# Team Task Manager

Team Task Manager is a full-stack web application designed to help teams organize projects, assign tasks, track progress, and manage collaboration from a shared workspace. The application includes user authentication, project membership management, task assignment, task status tracking, dashboard summaries, and role-based access control.

## Project Overview

The system is divided into two independent applications:

- `team-task-manager-frontend`: React, TypeScript, and Vite client application.
- `team-task-manager-backend`: Express, TypeScript, MongoDB, and Mongoose REST API.

The frontend communicates with the backend through HTTP API requests. 
By default, the frontend runs on `http://127.0.0.1:5173`, and the backend runs on `http://localhost:5000`.

## Core Functionality

### User Authentication

- User signup with name, email, and password.
- User login with email and password.
- JWT-based authentication for protected API routes.
- Persistent login using browser local storage.
- Authenticated user refresh through the `/api/auth/me` endpoint.
- Logout support that clears stored authentication data.

### Role Management

- Users can have either an `admin` or `member` role.
- The first registered user is assigned the `admin` role automatically.
- Global administrators can access broader project and task data.
- Project-level roles control who can manage individual projects and tasks.

### Project Management

- Create projects with a name and optional description.
- View projects associated with the authenticated user.
- Update project name and description.
- Delete projects when permitted.
- Maintain project membership with project-specific roles.
- Add, update, and remove project members.
- Project creators are protected from being removed from their own project.

### Task Management

- Create tasks under selected projects.
- Assign tasks to project members.
- Set task priority as `low`, `medium`, `high`, or `urgent`.
- Track task status as pending, in progress, or completed.
- Edit task details when the user has sufficient permission.
- Update task status directly from the dashboard.
- Delete tasks when permitted.
- Filter and search tasks in the frontend dashboard.

### Dashboard

- Displays total projects, total tasks, completed tasks, pending tasks, and in-progress tasks.
- Shows recent task activity.
- Displays project-level progress information.
- Supports project-specific task views.
- Provides task creation, editing, deletion, and assignment workflows.

### User Interface

- Protected dashboard route for authenticated users.
- Login and signup pages.
- Light and dark theme support.
- Responsive frontend layout.
- Client-side routing with React Router.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack React Query
- Axios

### Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JSON Web Tokens
- bcryptjs
- Zod
- CORS
- dotenv

## Folder Structure

```text
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
└── team-task-manager-frontend
    ├── src
    │   ├── auth
    │   ├── pages
    │   ├── ui
    │   ├── App.tsx
    │   └── frontend-api.ts
    ├── package.json
    └── vite.config.ts
```

## Environment Configuration

The backend uses a `.env` file for runtime configuration.

Required backend environment variables:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=7d
```

The frontend uses the following API base configuration:

```ts
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000';
```

This means the frontend will use `VITE_API_BASE` when it is provided. If it is not provided, it will send API requests to `http://localhost:5000`.

Optional frontend environment variable:

```env
VITE_API_BASE=http://localhost:5000
```

Do not commit real secrets such as database credentials, JWT secrets, passwords, or production API keys to a public repository.

## Installation

Install backend dependencies:

```bash
cd team-task-manager-backend
npm install
```

Install frontend dependencies:

```bash
cd team-task-manager-frontend
npm install
```

## Running the Application

Start the backend API:

```bash
cd team-task-manager-backend
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

Start the frontend application:

```bash
cd team-task-manager-frontend
npm run dev
```

The frontend runs on:

```text
http://127.0.0.1:5173
```

## Available Scripts

### Backend

```bash
npm run dev
```

Runs the backend in development mode using TypeScript.

```bash
npm run build
```

Compiles the backend TypeScript source into the `dist` directory.

```bash
npm start
```

Runs the compiled backend application from `dist/index.js`.

### Frontend

```bash
npm run dev
```

Runs the Vite development server.

```bash
npm run build
```

Builds the frontend for production.

```bash
npm run lint
```

Runs ESLint for the frontend codebase.

```bash
npm run preview
```

Serves the production frontend build locally for preview.

## API Endpoints

### System

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Returns API information and available endpoint groups. |
| GET | `/health` | Returns backend health status. |

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/signup` | Registers a new user. |
| POST | `/api/auth/login` | Authenticates an existing user. |
| GET | `/api/auth/me` | Returns the authenticated user profile. |
| GET | `/api/auth/users` | Returns searchable user records for assignment and membership workflows. |

### Projects

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/projects` | Lists accessible projects. |
| POST | `/api/projects` | Creates a new project. |
| PATCH | `/api/projects/:projectId` | Updates a project. |
| DELETE | `/api/projects/:projectId` | Deletes a project and its tasks. |
| POST | `/api/projects/:projectId/members` | Adds or updates a project member. |
| PATCH | `/api/projects/:projectId/members/:userId` | Updates a member role. |
| DELETE | `/api/projects/:projectId/members/:userId` | Removes a member from a project. |

### Tasks

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/tasks/dashboard` | Returns dashboard summaries, task activity, and progress data. |
| GET | `/api/tasks` | Lists tasks for a selected project. |
| POST | `/api/tasks` | Creates a new task. |
| PATCH | `/api/tasks/:taskId` | Updates task details or status. |
| DELETE | `/api/tasks/:taskId` | Deletes a task. |

## Data Models

### User

- `email`
- `name`
- `passwordHash`
- `role`
- `createdAt`

### Project

- `name`
- `description`
- `createdBy`
- `members`
- `archived`
- `createdAt`
- `updatedAt`

### Task

- `projectId`
- `title`
- `description`
- `priority`
- `status`
- `dueDate`
- `assigneeId`
- `createdBy`
- `createdAt`
- `updatedAt`

## Access Control Summary

- Authentication is required for project, task, and user lookup routes.
- Global administrators have elevated access across the system.
- Project administrators can manage project details, project members, and project tasks.
- Project members can access assigned project data and update permitted task fields.
- Task updates are restricted based on project role, task assignment, and creator ownership.

## Build Verification

Before deployment, run the following commands:

```bash
cd team-task-manager-backend
npm run build
```

```bash
cd team-task-manager-frontend
npm run build
```

These commands verify that both applications compile successfully.

## Security Notes

- Store sensitive configuration in environment variables.
- Keep real `.env` files out of public repositories.
- Use a strong `JWT_SECRET` for non-local environments.
- Restrict `CORS_ORIGIN` to trusted frontend domains in production.
- Use a secured MongoDB connection string with appropriate user permissions.

## Repository Status

This README is intended for local project documentation and repository presentation. Creating this file does not push any code or configuration to a remote Git repository.
