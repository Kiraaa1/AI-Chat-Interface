# AI Chat App

A full-stack streaming chat app: FastAPI backend (OpenAI **or** Anthropic, switchable
via env var) with server-side tool calling, and a React 18 + Vite + Tailwind
frontend that renders tokens in real time over Server-Sent Events.

> **Live demo:** _coming soon_ (replace this placeholder with your deployed
> URL once the frontend is on Vercel and the backend is on Railway/Fly)

---

## Features

- **Token streaming** end-to-end: SSE from FastAPI, parsed incrementally on the
  client and rendered as the model types.
- **Two LLM providers**, picked by the `LLM_PROVIDER` env var:
  - `openai` (default): uses the chat completions streaming API.
  - `anthropic`: uses the Messages streaming API.
- **Server-side tool calling** with two real tools:
  - `get_current_time(timezone_name?)`: IANA-aware timestamps.
  - `web_search(query, max_results?)`: Tavily if `TAVILY_API_KEY` is set,
    otherwise DuckDuckGo via the `ddgs` package (no key required).
- **Tool round-trips are invisible to the client.** The backend runs the
  multi-turn loop (LLM → tool call → tool result → LLM …) and the same SSE
  stream just keeps flowing. The frontend gets typed events:
  `token`, `tool_call`, `tool_result`, `done`, `error`.
- **Mid-stream tool indicators**: while the model is calling `web_search`, the
  UI shows a "Searching the web…" chip; on completion the chip flips to
  "Searched the web" and exposes the raw JSON result on click.
- **Cancel mid-stream** with a Stop button (aborts the underlying fetch).

---

## Repository layout

```
.
├── backend/                 FastAPI app, Dockerfile, fly.toml
│   └── app/
│       ├── main.py          /chat SSE endpoint, /health, CORS
│       ├── providers/       OpenAI + Anthropic streaming providers
│       └── tools/           Tool registry, get_current_time, web_search
├── frontend/                React 18 + Vite + TS + Tailwind, vercel.json
│   └── src/
│       ├── App.tsx          Top-level chat state and stream consumer
│       ├── components/      Header, Message, ToolBadge, ChatInput
│       ├── lib/sse.ts       fetch + ReadableStream SSE parser
│       └── types/chat.ts    Shared event/message TypeScript types
└── README.md
```

---

## Local development

You'll need **Python 3.11+** and **Node 18+**.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set LLM_PROVIDER and the matching API key

uvicorn app.main:app --reload --port 8000
```

Sanity-check the backend:

```bash
curl http://localhost:8000/health
# {"status":"ok","provider":"openai","model":"gpt-4o-mini"}
```

### 2. Frontend

```bash
cd frontend
npm install

# Optional: override the backend URL (defaults to http://localhost:8000)
cp .env.example .env.local

npm run dev
# open http://localhost:5173
```

That's it. Send a message; tokens stream in. Try one of the suggested prompts
(e.g. "What time is it in Tokyo right now?") to see a tool call get dispatched
mid-stream.

---

## Deployment

### Backend → Railway or Fly.io (Docker)

The backend ships with a production-ready `backend/Dockerfile` that respects
`$PORT` (Railway and Fly both inject it).

**Railway:**

1. Create a new project from the repo, point it at the `backend/` folder.
2. Set service variables: `LLM_PROVIDER`, `OPENAI_API_KEY` _or_
   `ANTHROPIC_API_KEY`, and `CORS_ORIGINS` (your Vercel URL, comma-separated).
3. Deploy. Railway autodetects the Dockerfile.

**Fly.io:**

```bash
cd backend
fly launch --no-deploy        # generates fly.toml tied to your account
fly secrets set LLM_PROVIDER=openai OPENAI_API_KEY=sk-... \
                CORS_ORIGINS=https://your-app.vercel.app
fly deploy
```

A starter `backend/fly.toml` is included if you'd rather edit and `fly deploy`
directly.

### Frontend → Vercel

1. Import the repo, set the **Root Directory** to `frontend/`.
2. Vercel detects Vite via `vercel.json` (build: `npm run build`,
   output: `dist`).
3. Add the env var `VITE_API_BASE_URL` pointing at your deployed backend.
4. Deploy. The included `vercel.json` adds an SPA fallback rewrite.

Don't forget to add the Vercel URL to the backend's `CORS_ORIGINS`.

---

## Architecture decisions

### Why SSE instead of WebSockets?

The traffic pattern here is one-way streaming from server to client during a
single request. SSE is purpose-built for that:

- **Plain HTTP, no upgrade dance.** Plays nicely with every reverse proxy,
  CDN, and serverless platform without per-vendor WebSocket configuration
  (looking at you, Vercel).
- **Auto-reconnect, ordering, and `Last-Event-ID`** are part of the spec.
  WebSockets give you a raw socket and you reinvent all of that.
- **Cheaper to scale.** No persistent connection state beyond the in-flight
  HTTP response; once the model finishes, the connection closes and the
  worker is free.
- **Trivial to cancel.** Aborting the `fetch()` on the client tears down the
  stream cleanly; the backend sees `await request.is_disconnected()` flip and
  bails out of its async generator.

WebSockets would only pay off if the frontend also needed to send messages
mid-stream (e.g. a collaborative canvas). For a chat send-receive cycle, SSE
wins on simplicity.

We use `fetch()` + `ReadableStream` rather than the browser's native
`EventSource` because `EventSource` is GET-only and our request body carries
the full message history. The custom parser in `frontend/src/lib/sse.ts` is
~30 lines.

### How tool calls are handled mid-stream

Each provider implementation in `backend/app/providers/` runs the tool loop
**inside** the same async generator that produces the SSE stream:

1. Open a streaming completion with the conversation history + tool schemas.
2. As deltas arrive, yield `{type: "token", delta}` for text and accumulate
   any partial tool-call JSON (OpenAI streams tool args as a string; Anthropic
   streams them as `input_json_delta` chunks).
3. When the model stops with `finish_reason == "tool_calls"` (OpenAI) or
   `stop_reason == "tool_use"` (Anthropic), emit a
   `{type: "tool_call", name, args}` event so the UI can show
   "Searching the web…" immediately.
4. Execute the tool via `app/tools/registry.py`, emit
   `{type: "tool_result", result}`, append the assistant's tool-use turn and
   the tool-result turn to the local message history, and re-open a
   streaming completion to let the model continue. Bounded to 5 rounds to
   avoid runaway loops.
5. Final text streams through to the client as more `token` events. From the
   user's perspective: tokens, then a brief "Searching the web…" chip, then
   more tokens. No client-side orchestration required.

This keeps the protocol uniform: the frontend doesn't need to know the
difference between OpenAI's and Anthropic's tool-call formats, and it means
adding a new tool is one entry in `TOOLS` plus a JSON Schema. Both
provider-specific tool spec formats are derived from the same registry.

### Other small choices

- **Pydantic v2** for request/response validation; the only thing the client
  actually sends is `{messages, model?, temperature?}`. Tool round-trips are
  not part of the persisted client history.
- **`sse-starlette`** for the SSE response so we get heartbeat pings (every
  15 s) and disconnect detection without rolling our own.
- **No component library** on the frontend: the chat surface is small enough
  that hand-rolled Tailwind components stay readable, and the bundle stays
  ~50 kB gzipped.
