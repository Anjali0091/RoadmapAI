# RoadmapAI

AI-powered study roadmap generator built with the MERN stack. Enter your course duration, daily study hours, target level, learning style and the stack you want to learn, and RoadmapAI creates a month-by-month, day-by-day study plan you can track.

<!-- Add a screenshot here: ![RoadmapAI](screenshot.png) -->

## Features

- AI-generated roadmaps split into monthly phases, with a topic for every day
- Tailored to your daily study hours, target level (Beginner, Intermediate, Advanced) and learning style (Theory, Practical or Both)
- Works with any stack you type, for example `dsa, mern, java, springboot, python+ml, react+typescript`
- Tick box on every day to track your progress
- Signup and login with hashed passwords (bcrypt) and JWT authentication
- Each user's roadmap and progress are saved in MongoDB, so they are still there after a refresh or a new login
- Clean white, black, red and yellow interface that works on desktop and mobile

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Authentication | JWT, bcryptjs |
| AI | Google Gemini API |

## How it works

1. The user signs up or logs in and receives a JWT, which the frontend keeps in `localStorage`.
2. The user fills in the form. The backend sends the answers to the Gemini API and asks for a roadmap as JSON.
3. The backend saves the roadmap under that user in MongoDB (one roadmap per user, replaced when a new one is generated).
4. Ticking a day sends a small update to the backend, which saves the `done` value for that day.
5. On the next visit, the saved roadmap is loaded from the database.

## Project structure

```
roadmapai/
├── backend/
│   ├── index.js              # Express app and MongoDB connection
│   ├── middleware/
│   │   └── auth.js           # JWT check for protected routes
│   ├── models/
│   │   ├── User.js
│   │   └── Roadmap.js
│   └── routes/
│       ├── auth.js           # signup, login, me
│       └── roadmap.js        # generate, load, tick a day
└── frontend/
    └── src/
        ├── App.jsx           # form, roadmap view, progress ticks
        ├── Auth.jsx          # login and signup page
        └── index.css
```

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally (or a MongoDB Atlas connection string)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/roadmapai.git
cd roadmapai
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a file named `.env` inside `backend` with:

```
GEMINI_API_KEY=your_gemini_api_key
MODEL=gemini-3.8-flash
MODEL_FALLBACK=
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/roadmapai
JWT_SECRET=a_long_random_string
```

- `MODEL` is the Gemini model to use. Model names change over time, so check which ones are available to your key in Google AI Studio.
- `MODEL_FALLBACK` is optional. If set, it is used when the main model is busy.
- Generate a strong `JWT_SECRET` with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

Start the backend:

```bash
npm start
```

You should see `MongoDB connected` and `Server running on http://localhost:5001`.

### 3. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the address it prints (usually `http://localhost:5173`). The Vite dev server forwards `/api` requests to the backend on port 5001. If you change the backend port, update the proxy in `frontend/vite.config.js` too.

## API endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create an account, returns a token |
| POST | `/api/auth/login` | No | Log in, returns a token |
| GET | `/api/auth/me` | Yes | Check the current token |
| GET | `/api/roadmap` | Yes | Load the saved roadmap |
| POST | `/api/roadmap` | Yes | Generate a new roadmap with AI and save it |
| PATCH | `/api/roadmap/day` | Yes | Tick or untick a day: `{ "phase": 0, "day": 0, "done": true }` |

Protected routes need the header `Authorization: Bearer <token>`.

## Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Key for the Gemini API |
| `MODEL` | Main Gemini model name |
| `MODEL_FALLBACK` | Optional backup model |
| `PORT` | Backend port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign login tokens |

Never commit your `.env` file. It is already listed in `.gitignore`.

## Future improvements

- Progress bar showing how many days are completed
- Delete or regenerate a roadmap
- Multiple roadmaps per user
- Rate limiting on login and AI routes
- Deployment with a hosted database
