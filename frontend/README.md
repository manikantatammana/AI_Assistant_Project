# AI Assistant — Frontend

React 19 + Vite. Pages: Home, Chat, Resume Analyzer.

## Run

```bash
# 1. backend (from /backend)
uvicorn app.main:app --reload          # http://127.0.0.1:8000

# 2. frontend (from /frontend)
npm install
npm run dev                            # http://localhost:5173
```

In development the Vite dev server proxies `/api` and `/health` to the backend
(`vite.config.js`), so no CORS setup is needed. Backend on another address:
`VITE_BACKEND_URL=http://host:port npm run dev`.

For a production build served separately from the API, set the API origin at
build time and add that origin to the CORS list in `backend/app/main.py`:

```bash
VITE_API_URL=https://api.example.com npm run build
```

## Structure

```
src/
  api.js            all backend calls (one place to change when auth is added)
  utils.js          dates, grouping, resume-analysis parser
  pages/            Home, Chat, Resume
  components/       Header, Rail, ThreadList, Markdown, Toast, ConfirmDialog, Icons
  hooks/            useRoute (hash router), useLibrary (shared chat/resume lists), useHealth
  styles/           base (tokens), layout, home, chat, resume
```
