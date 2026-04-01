# Code Analyzer & Visualizer

Point a GitHub repo URL at this tool and get an interactive dashboard showing:

- **Cyclomatic complexity** per function — sortable table + D3 treemap heatmap
- **Dependency graph** — force-directed D3 graph of module imports with zoom/pan
- **Duplicate code** — Winnowing-algorithm clone detection with snippet previews
- **Dead code** — unused exports, functions, and imports with confidence scoring

Supports **Python** and **JavaScript/TypeScript** repos. No LLM — all deterministic static analysis.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + Python 3.11 |
| Python analysis | `radon` (complexity), `ast` (dependencies), `vulture` (dead code), custom Winnowing (duplicates) |
| JS/TS analysis | Node.js worker using `acorn` + `@typescript-eslint/typescript-estree` |
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Visualization | D3.js v7 (force graph, treemap), Recharts |
| State | Zustand + TanStack Query |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git (must be on PATH)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies for the JS worker
cd js_worker
npm install
cd ..

# Copy env config
cp .env.example .env

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How it works

```
User pastes GitHub URL
        │
        ▼
POST /api/analyze  →  job queued (returns job_id)
        │
        ▼  (background task)
git clone --depth=1  →  temp directory
        │
        ▼
Walk files  →  classify Python / JS / TS
        │
        ├──► Python analyzer (in-process)
        │       radon CC  ·  ast imports  ·  vulture  ·  Winnowing
        │
        └──► JS/TS analyzer (node analysis_worker.js)
                acorn CC  ·  import edges  ·  export tracking  ·  Winnowing
        │
        ▼
Merge results  →  store in job_store
        │
        ▼
GET /api/jobs/{job_id}  ←  frontend polls every 2s
        │
        ▼
Dashboard renders
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  FastAPI entry point
│   ├── config.py                Settings (env vars)
│   ├── api/routes/
│   │   ├── analysis.py          POST /analyze, GET /jobs/{id}
│   │   └── health.py            GET /health
│   ├── core/
│   │   ├── pipeline.py          Clone → walk → analyze → merge
│   │   ├── cloner.py            git clone with size guard
│   │   ├── file_walker.py       Recursive file classifier
│   │   └── job_store.py         In-memory job state
│   ├── analyzers/
│   │   ├── python/              complexity · dependencies · dead_code · duplicates
│   │   └── javascript/          subprocess runner + result parser
│   └── models/                  Pydantic request/response schemas
└── js_worker/                   Node.js static analysis worker
    ├── analysis_worker.js       CLI entry point
    └── src/
        ├── complexity.js        acorn AST → CC per function
        ├── dependencies.js      import/require → edge list
        ├── dead_code.js         export tracking → unreferenced symbols
        ├── duplicates.js        token Winnowing → clone groups
        └── file_walker.js       recursive JS/TS file discovery

frontend/src/
├── api/                         axios client + TypeScript types
├── store/                       Zustand (jobId, result)
├── hooks/                       useAnalysis (submit + polling)
└── components/
    ├── input/RepoUrlForm        URL input with example repos
    ├── dashboard/               Summary cards + tab layout
    ├── complexity/              Sortable table + D3 heatmap
    ├── dependency/              D3 force-directed graph
    ├── duplicates/              Expandable clone group list
    └── deadcode/                Filterable dead symbol table
```

---

## Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Skeleton — clone → job → poll → empty result | Done |
| 2 | Python analysis — all four analyzers | Done |
| 3 | JS/TS analysis — Node.js worker | Done |
| 4 | Frontend dashboard — all four panels | Done |
| 5 | Polish — SSE progress, rate limiting, error hardening | Planned |
