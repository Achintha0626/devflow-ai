# DevFlow AI 🚀

<p align="center">
  <strong>An AI-powered project and task management platform for modern development teams.</strong>
</p>

<p align="center">
  <a href="https://devflow-ai-cyan.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Application-Open%20DevFlow%20AI-635BDB?style=for-the-badge" alt="Open DevFlow AI live application">
  </a>
</p>

---

## 🌟 About the Project

**DevFlow AI** is a full-stack web application built to help teams organize workspaces, manage projects, collaborate with team members, and track development progress in one place.

The platform combines essential project management tools with AI-assisted planning and a machine-learning service for task-delay prediction.

## ✨ Key Features

- **Workspace Management** — Create workspaces, manage members, and control workspace access.
- **Role-Based Access Control** — Separate workspace administration from project-level responsibilities. Workspace creators receive the **Administrator** role.
- **Project Management** — Create projects and organize team responsibilities.
- **Task Management** — Create, assign, and track tasks throughout the development workflow.
- **Kanban Boards** — Visualize work and task progress.
- **Sprint Management** — Organize work into development sprints.
- **Requirements Management** — Keep project requirements organized.
- **AI Planner** — Support project planning with AI-assisted workflows.
- **Analytics** — Review project activity and progress.
- **ML-Based Task Delay Prediction** — A dedicated machine-learning service for task-delay predictions.

> **ML note:** The current prediction model is a synthetic development model and has not been validated for real-world production accuracy.

## 🧰 Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Authentication | JSON Web Tokens (JWT) |
| Background Jobs and Cache | Redis, BullMQ |
| Machine Learning API | Python, FastAPI |
| ML Libraries | scikit-learn, pandas, NumPy, Joblib |
| AI Integration | Google Gemini API |
| Deployment | Vercel and Render |

## 🏗️ Architecture

```text
React + Vite Frontend
        │
        ▼
Node.js + Express Backend
        │
        ├── PostgreSQL (application data)
        ├── Redis + BullMQ (background jobs)
        ├── Google Gemini API (AI features)
        └── FastAPI ML Service (task-delay predictions)
```

## 📁 Project Structure

```text
devflow-ai/
└── devflow-ai/
    ├── backend/
    │   ├── prisma/
    │   ├── src/
    │   ├── tests/
    │   └── package.json
    ├── frontend/
    │   ├── src/
    │   ├── public/
    │   └── package.json
    ├── ml-service/
    │   ├── app/
    │   ├── models/
    │   ├── tests/
    │   └── requirements.txt
    └── docker-compose.yml
```

## 🚀 Run Locally

### Prerequisites

Install **Node.js and npm**, **Python**, **PostgreSQL**, **Redis**, and **Git**.

### 1. Clone the repository

```bash
git clone https://github.com/Achintha0626/devflow-ai.git
cd devflow-ai/devflow-ai
```

### 2. Start the backend

```bash
cd backend
npm install
```

Create a local `.env` file based on `.env.example`. Configure your PostgreSQL `DATABASE_URL`, Redis `REDIS_URL`, distinct secure JWT secrets, `FRONTEND_URL`, `ML_SERVICE_URL`, and `GEMINI_API_KEY`.

Create the `devflow_ai` PostgreSQL database, then apply the existing migrations and generate the Prisma client:

```bash
npx prisma migrate deploy --config prisma7.config.ts
npm run build
npm run dev
```

The backend normally runs at `http://localhost:5000`.

### 3. Start the frontend

Open another terminal:

```bash
cd devflow-ai/frontend
npm install
```

Create a `.env` file based on `.env.example` and set:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Run the frontend:

```bash
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

### 4. Start the ML service

Open another terminal:

```bash
cd devflow-ai/ml-service
python -m venv .venv
```

Activate the environment.

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install dependencies and run the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The ML service normally runs at `http://localhost:8000`. Its model artifacts must be available in the expected `models` directory.

## 🧪 Quality Checks

Run these commands from their respective directories:

**Backend tests**
```bash
npm test
```

**Frontend lint**
```bash
npm run lint
```

**Frontend production build**
```bash
npm run build
```

**ML service tests** (from the project root)
```bash
python -m pytest ml-service/tests -v
```

## 🔐 Environment and Security

- Use `.env.example` as a template for local configuration.
- Never commit `.env` files, API keys, database credentials, or JWT secrets.
- Use different, strong values for access-token and refresh-token secrets.
- Configure production environment variables in the hosting dashboards.
- Keep authorization checks on the backend for protected operations.

## ☁️ Deployment

The application is deployed using **Vercel** for the frontend and **Render** for the backend and ML service.

For local development, configure the frontend API base URL and the backend's `FRONTEND_URL` and `ML_SERVICE_URL` to match the services you are running.

Free hosting services may spin down after inactivity or have storage, persistence, and availability limits.

## 👥 Roles at a Glance

**Workspace roles** govern access to workspace-level administration and membership.

**Project roles** govern responsibilities within a specific project, such as project management, development, and QA.

The user who creates a workspace is assigned the **Workspace Administrator** role. Project membership roles remain separate from workspace roles.

## 👨‍💻 Author

**Achintha Prabashwara**

- GitHub: [Achintha0626](https://github.com/Achintha0626)

## 📄 License

No license is specified yet. Add a license file if you intend to define permissions for reuse, modification, and distribution.

---

<p align="center">
  <em>Plan smarter. Collaborate better. Deliver with confidence.</em>
</p>
