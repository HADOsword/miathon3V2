# 🔐 React Authentication App

A full-stack authentication application built with **React** (frontend) and a **Node.js/Express** REST API (backend). Features include user registration, login, JWT-based protected routes, and a personal dashboard.

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- npm or yarn
- Backend API running on `http://localhost:3000`

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

### Run the app

```frontend / backend
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default).

---

## 🔗 API Endpoints

The frontend communicates with a REST API at `http://localhost:3000/api/v1`.



## 🧭 Routes

| Path | Component | Protected |
|------|-----------|-----------|
| `/` | `Landing` | ❌ |
| `/login` | `Login` | ❌ |
| `/register` | `Register` | ❌ |
| `/dashboard` | `Dashboard` | ✅ JWT required |
| `/logout` | `Logout` | ❌ |

---

## 🔒 Authentication Flow

1. User registers via `/register` → credentials sent to API → redirected to `/login`
2. User logs in via `/login` → API returns a JWT token → token stored in `localStorage` as `auth`
3. On visiting `/dashboard` → token read from `localStorage` → sent as `Authorization: Bearer <token>` header
4. On logout → `localStorage` cleared → user redirected to `/` after 3 seconds

---

## 🛠️ Built With

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [React Router v6](https://reactrouter.com/)
- [Axios](https://axios-http.com/)
- [React Toastify](https://fkhadra.github.io/react-toastify/)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
