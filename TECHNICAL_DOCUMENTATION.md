# SOCNITI — Technical Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend Services](#5-backend-services)
6. [Frontend Application](#6-frontend-application)
7. [Database Layer](#7-database-layer)
8. [Authentication & Security](#8-authentication--security)
9. [Real-Time Communication](#9-real-time-communication)
10. [GraphQL & Federation](#10-graphql--federation)
11. [Key Libraries Explained](#11-key-libraries-explained)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [Environment Configuration](#13-environment-configuration)
14. [Running the Project](#14-running-the-project)

---

## 1. Project Overview

**SOCNITI** (Social Community Network for Impact) is a full-stack web platform that connects volunteers, event organizers, and donors for social impact activities. It is built as a **microservices monorepo** — meaning multiple independent backend services live in the same repository but run as separate Node.js processes.

### What the platform does
- Users can **browse and join** community events (cleanups, medical camps, donation drives)
- Organizers can **create and manage** events with participant tracking and waitlists
- Donors can **contribute money or items** to specific events
- Registered participants can **chat in real time** within an event's chat room
- Users have a **profile page** showing their activity: events joined, hosted, and donated to

---

## 2. Architecture

SOCNITI uses a **microservices architecture** with **Apollo Federation** to stitch all services into a single unified GraphQL API.

```
┌─────────────────────────────────────────────────────────────┐
│                   Browser / Mobile                          │
│              React App  (http://localhost:5173)             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway  (http://localhost:8080)           │
│         Apollo Federation Gateway — single GraphQL entry    │
└────┬──────────────┬──────────────┬──────────────┬───────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│  Auth   │  │  Event   │  │  Chat    │  │  Donation    │
│ :4001   │  │:4002/:4005│  │:4003/:4006│  │ :4007/:4008  │
│GraphQL  │  │REST+GQL  │  │WS + GQL  │  │ REST + GQL   │
└────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘
     │            │             │               │
     └────────────┴─────────────┴───────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Supabase PostgreSQL  │
              │  (hosted cloud DB)     │
              └────────────────────────┘
```

### Why Microservices?
Each service owns its own domain logic and can be deployed, scaled, or updated independently. The API Gateway hides this complexity from the frontend — the React app only talks to one URL.

---

## 3. Repository Structure

```
socniti/                          ← monorepo root
├── apps/
│   └── frontend/                 ← React + Vite frontend
│       ├── src/
│       │   ├── components/       ← Reusable UI components
│       │   ├── pages/            ← Route-level page components
│       │   ├── context/          ← React Context (auth state)
│       │   └── lib/              ← API client (axios instances)
│       ├── tailwind.config.js
│       └── vite.config.js
│
├── services/
│   ├── auth-service/             ← User accounts, login, OTP
│   ├── event-service/            ← Events CRUD, registration
│   ├── chat-service/             ← WebSocket + message storage
│   ├── donation-service/         ← Monetary & item donations
│   ├── api-gateway/              ← Apollo Federation gateway
│   └── notification-service/     ← Placeholder (email reminders)
│
├── packages/
│   └── shared/                   ← Shared utilities + DB client
│       └── src/
│           ├── db.js             ← PostgreSQL connection pool
│           ├── migrate.js        ← Auto-creates DB tables
│           ├── helpers.js        ← toSlug(), etc.
│           └── constants.js      ← EVENT_CATEGORIES, etc.
│
├── .env                          ← Environment variables
├── package.json                  ← Workspace root (npm workspaces)
└── docker-compose.yml            ← Optional Docker setup
```

### npm Workspaces
The root `package.json` declares `workspaces: ["apps/*", "services/*", "packages/*"]`. This means running `npm install` at the root installs dependencies for all packages and creates symlinks so services can `require("@socniti/shared")` directly.

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend framework | React | 19 | UI component tree |
| Frontend build tool | Vite | 6 | Dev server + bundler |
| CSS framework | Tailwind CSS | 3 | Utility-first styling |
| Routing (frontend) | React Router DOM | 7 | Client-side navigation |
| HTTP client | Axios | 1 | API requests from browser |
| State management | React Context API | built-in | Auth state |
| Server queries | TanStack Query | 5 | Data fetching + caching |
| Toast notifications | react-hot-toast | 2 | User feedback popups |
| Icons | Lucide React | 0.475 | SVG icon library |
| Date utilities | date-fns | 4 | Date formatting |
| WebSocket client | Socket.IO Client | 4 | Real-time chat |
| Backend runtime | Node.js | 24 | JavaScript server runtime |
| Backend framework | Express | 4 | HTTP server for REST APIs |
| GraphQL server | Apollo Server | 4/5 | GraphQL endpoint |
| GraphQL federation | Apollo Subgraph | 2 | Federated schema |
| GraphQL gateway | Apollo Gateway | 2 | Schema composition |
| Real-time server | Socket.IO | 4 | WebSocket server |
| Authentication | JSON Web Tokens | 9 | Stateless auth tokens |
| Password hashing | bcryptjs | 2 | Secure password storage |
| Email | Nodemailer | 8 | SMTP email sending |
| Database | PostgreSQL (Supabase) | 15 | Relational data store |
| DB client | pg (node-postgres) | 8 | PostgreSQL driver |
| Process manager | concurrently | 9 | Run multiple services |
| Monorepo | npm workspaces | built-in | Shared dependencies |

---

## 5. Backend Services

### 5.1 Auth Service (Port 4001)

**Responsibility:** User registration, login, OTP verification, JWT issuance.

**How it works:**
1. User submits signup form → service hashes password with bcrypt → generates 6-digit OTP → sends OTP via Gmail SMTP → stores user as `verified: false`
2. User submits OTP → service validates OTP and expiry → marks user `verified: true` → issues JWT
3. Login: user submits username + password → bcrypt compares hash → issues JWT

**Key files:**
- `src/index.js` — starts Apollo Server on port 4001
- `src/schema.js` — GraphQL type definitions (User, AuthPayload, mutations)
- `src/resolvers.js` — business logic for signup/login/OTP
- `src/models/User.js` — PostgreSQL query wrapper (replaces Mongoose)

**GraphQL mutations exposed:**
```graphql
signup(fullName, username, email, password, role) → OtpStatus
verifySignupOtp(email, otp) → AuthPayload { token, user }
login(username, password) → AuthPayload { token, user }
```

---

### 5.2 Event Service (Ports 4002 REST, 4005 GraphQL)

**Responsibility:** Create, read, update, delete events. Handle participant registration and waitlists.

**Dual API:** This service exposes both a REST API (Express on port 4002) and a GraphQL subgraph (Apollo Server on port 4005). Both use the same PostgreSQL model underneath.

**REST endpoints:**
```
GET    /api/events              → list events (with filters)
GET    /api/events/:slug        → get single event
POST   /api/events              → create event (auth required)
PATCH  /api/events/:slug        → update event (organizer only)
DELETE /api/events/:slug        → delete event (organizer only)
POST   /api/events/:slug/register  → join event
POST   /api/events/:slug/cancel    → cancel registration
GET    /api/events/dashboard    → organizer analytics
```

**Registration logic:**
- If `currentParticipants < maxParticipants` → add to `event_participants` table, increment count
- Otherwise → add to waitlist (`is_waitlist = true`)
- On cancellation → if waitlist exists, promote first waitlist person to participant

**Key files:**
- `src/controllers/eventController.js` — REST handler functions
- `src/graphql/resolvers.js` — GraphQL resolver functions
- `src/graphql/schema.js` — GraphQL type definitions
- `src/graphql/context.js` — extracts JWT user from request headers
- `src/models/Event.js` — PostgreSQL query wrapper
- `src/utils/geo.js` — Haversine formula for distance calculation

---

### 5.3 Chat Service (Ports 4003 WebSocket, 4006 GraphQL)

**Responsibility:** Real-time event chat rooms using WebSockets. Also exposes a GraphQL subgraph for message history queries.

**How Socket.IO works here:**
1. Frontend connects: `io("http://localhost:4003", { auth: { token: JWT } })`
2. Server middleware verifies JWT → attaches `socket.userId` and `socket.username`
3. Client emits `join-event` with an event ID → server calls `socket.join("event-{id}")` (a Socket.IO room)
4. Client emits `send-message` → server saves to PostgreSQL → broadcasts to all sockets in the room via `io.to("event-{id}").emit("new-message", ...)`
5. Typing indicators: `typing` / `stop-typing` events broadcast to room without DB storage

**Socket.IO rooms:** A "room" is a named channel. Any socket can join/leave rooms. `io.to(room).emit(...)` sends to all sockets in that room.

**Key files:**
- `src/index.js` — Express + Socket.IO + Apollo Server all in one file
- `src/models/Message.js` — PostgreSQL query wrapper with chainable `.sort().limit()` API

---

### 5.4 Donation Service (Ports 4007 REST, 4008 GraphQL)

**Responsibility:** Record monetary and item donations linked to events.

**Donation types:**
- `monetary` — amount in ₹, stored as `DOUBLE PRECISION`
- `item` — item name + quantity, amount stored as 0

**REST endpoints:**
```
GET  /api/donations/event/:eventId  → list donations + stats for event
POST /api/donations                 → create donation (auth required)
```

**GraphQL mutations:**
```graphql
createDonation(input: CreateDonationInput!) → Donation
```

**Key files:**
- `src/index.js` — Express + Apollo Server
- `src/models/Donation.js` — PostgreSQL query wrapper

---

### 5.5 API Gateway (Port 8080)

**Responsibility:** Compose all four subgraph schemas into one unified GraphQL API using Apollo Federation.

**How Apollo Federation works:**
- Each service is a "subgraph" — it has its own GraphQL schema annotated with `@key` directives
- The gateway uses `IntrospectAndCompose` to fetch each subgraph's schema at startup and every 5 seconds
- It merges them into a "supergraph" — one schema that spans all services
- When a query arrives, the gateway splits it into sub-queries, sends each to the right service, and merges the results

**Example of federation in action:**
```graphql
# Frontend sends this to the gateway:
query {
  events { events { id title organizer { fullName email } } }
}

# Gateway splits it:
# → Event Service: get events with organizerId
# → Auth Service: resolve User by id for each organizerId
# → Gateway merges and returns combined result
```

**Key file:** `src/index.js` — creates `ApolloGateway` with `IntrospectAndCompose`

---

## 6. Frontend Application

### 6.1 React + Vite

**React** is a JavaScript library for building UIs as a tree of components. Each component is a function that returns JSX (HTML-like syntax compiled to JavaScript).

**Vite** is the build tool and dev server. It uses native ES modules in the browser during development (no bundling needed), making hot module replacement (HMR) near-instant. For production it uses Rollup to bundle.

### 6.2 React Router DOM v7

Handles client-side navigation — the URL changes without a full page reload.

```jsx
// App.jsx defines routes
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/events/:slug" element={<EventDetailPage />} />
  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
</Routes>
```

`useNavigate()` — programmatic navigation  
`useParams()` — reads URL parameters like `:slug`  
`useLocation()` — reads current URL path (used for active tab in bottom nav)

### 6.3 Tailwind CSS

Utility-first CSS framework. Instead of writing CSS files, you apply pre-built classes directly in JSX:

```jsx
<button className="rounded-full bg-clay px-4 py-2 text-white font-semibold hover:bg-clay/90">
```

**Custom design tokens** defined in `tailwind.config.js`:
```js
colors: {
  ink:  "#112A22",  // dark green — primary text, dark backgrounds
  leaf: "#4A7C59",  // medium green — accents, success states
  clay: "#E18D58",  // orange — CTA buttons, highlights
  mist: "#F7F3E9",  // cream — page background
  ember:"#D44727",  // red — danger, errors
}
```

**Custom shadow:** `shadow-soft` = `0 20px 60px rgba(17,42,34,0.12)` — a soft, deep shadow.

### 6.4 Axios

HTTP client for making API requests. Two instances are configured in `src/lib/api.js`:

```js
// api — points to API Gateway (GraphQL)
const api = axios.create({ baseURL: "http://localhost:8080" });

// eventApi — points to Event Service REST API
const eventApi = axios.create({ baseURL: "http://localhost:4002" });
```

Both have request interceptors that automatically attach the JWT from `localStorage`:
```js
api.interceptors.request.use(config => {
  const token = localStorage.getItem("socniti_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### 6.5 React Context API (AuthContext)

Provides global auth state (current user + token) to any component in the tree without prop drilling.

```jsx
// AuthContext.jsx
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("socniti_token"));
  // ...
  return <AuthContext.Provider value={{ user, token, saveSession, logout }}>
    {children}
  </AuthContext.Provider>;
};

// Any component can access auth state:
const { user, logout } = useAuth();
```

### 6.6 Socket.IO Client

Used in `EventChat.jsx` and `ContactPage.jsx` for real-time features:

```js
const socket = io("http://localhost:4003", {
  auth: { token: localStorage.getItem("socniti_token") }
});

socket.on("new-message", (message) => setMessages(prev => [...prev, message]));
socket.emit("send-message", { eventId, content });
```

### 6.7 react-hot-toast

Lightweight toast notification library. Shows success/error messages as floating popups:

```js
toast.success("Registered successfully!");
toast.error("Please login to continue");
```

Configured in `App.jsx` with custom styling matching the SOCNITI color theme.

### 6.8 Lucide React

SVG icon library with 500+ icons as React components:
```jsx
import { MapPin, Calendar, Users, Heart } from "lucide-react";
<MapPin size={16} className="text-leaf" />
```

---

## 7. Database Layer

### 7.1 Supabase PostgreSQL

**Supabase** is a hosted PostgreSQL service (like Firebase but SQL-based). It provides:
- A managed PostgreSQL 15 database
- Connection pooling
- SSL-encrypted connections
- A web dashboard for viewing/editing data

The project connects directly to the PostgreSQL database using the `pg` driver — it does NOT use the Supabase JavaScript SDK. Supabase is just the hosting provider.

**Connection string format:**
```
postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres
```

### 7.2 pg (node-postgres)

The official PostgreSQL client for Node.js. Uses a **connection pool** (`Pool`) to reuse database connections efficiently.

```js
// packages/shared/src/db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // required for Supabase
  max: 10,                              // max 10 simultaneous connections
});

// Usage anywhere in the codebase:
const { query } = require("@socniti/shared");
const res = await query("SELECT * FROM users WHERE id = $1", [userId]);
```

**Parameterized queries** (`$1`, `$2`, ...) prevent SQL injection — values are sent separately from the query string.

### 7.3 Database Schema

Tables are auto-created on service startup by `packages/shared/src/migrate.js`:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user',
  verified BOOLEAN DEFAULT false,
  otp TEXT,
  otp_expires TIMESTAMPTZ,
  bio TEXT, location TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT, slug TEXT UNIQUE, description TEXT,
  category TEXT, organizer_id TEXT,
  location_name TEXT, city TEXT, state TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  starts_at TIMESTAMPTZ, max_participants INT DEFAULT 50,
  current_participants INT DEFAULT 0,
  waitlist_count INT DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  donation_needs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event participants (join table)
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  full_name TEXT, email TEXT,
  is_waitlist BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT, sender_id TEXT, sender_name TEXT,
  content TEXT, type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT, donor_id TEXT, donor_name TEXT,
  amount DOUBLE PRECISION DEFAULT 0,
  item TEXT, quantity INT,
  type TEXT, status TEXT DEFAULT 'completed',
  message TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 Model Pattern (PostgreSQL wrappers)

Since the project originally used Mongoose (MongoDB ODM), the PostgreSQL models are written to mimic the Mongoose API so resolvers needed minimal changes:

```js
// services/auth-service/src/models/User.js
const User = {
  async findById(id) { ... },
  async findOne(conditions) { ... },
  async create(data) { ... },
  async _save(user) { ... }
};

// Each returned object has a .save() method attached:
const user = await User.findOne({ email });
user.verified = true;
await user.save();  // calls User._save(user) internally
```

---

## 8. Authentication & Security

### 8.1 JSON Web Tokens (JWT)

JWTs are self-contained tokens that encode user identity. They have three parts separated by dots:
```
header.payload.signature
```

**Payload stored in SOCNITI tokens:**
```json
{
  "sub": "user-uuid",
  "id": "user-uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user",
  "iat": 1715000000,
  "exp": 1717592000
}
```

**How it flows:**
1. Auth service signs token with `JWT_SECRET` using `jsonwebtoken.sign()`
2. Frontend stores token in `localStorage` as `socniti_token`
3. Every API request includes `Authorization: Bearer <token>` header
4. Each service verifies the token with `jwt.verify(token, JWT_SECRET)`
5. If valid, `req.user` is set to the decoded payload

**Why stateless?** The server doesn't store sessions — the token itself contains all needed info. Any service can verify it independently using the shared secret.

### 8.2 bcryptjs

Password hashing library. Passwords are **never stored in plain text**.

```js
// On signup:
const salt = await bcrypt.genSalt(10);  // generates random salt (10 rounds)
const hashedPassword = await bcrypt.hash(password, salt);
// Stored in DB: "$2a$10$randomsalt...hashedvalue"

// On login:
const isMatch = await bcrypt.compare(enteredPassword, storedHash);
```

**Salt rounds (10):** Each additional round doubles the computation time, making brute-force attacks slower. 10 rounds is the industry standard balance between security and performance.

### 8.3 OTP (One-Time Password) Flow

```
User submits signup form
        ↓
Server generates: Math.floor(100000 + Math.random() * 900000).toString()
        ↓
Stores OTP + expiry (10 minutes) in users table
        ↓
Sends OTP via Gmail SMTP (Nodemailer)
        ↓
User enters OTP in frontend
        ↓
Server checks: otp matches AND new Date() < otpExpires
        ↓
Sets verified=true, clears otp field, issues JWT
```

### 8.4 Role-Based Access Control (RBAC)

Three roles: `user`, `organizer`, `admin`

- **user** — can join events, donate, chat
- **organizer** — can also create/edit/delete their own events
- **admin** — full access

Enforced in middleware:
```js
// services/event-service/src/middleware/authMiddleware.js
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  next();
};
```

---

## 9. Real-Time Communication

### 9.1 Socket.IO

Socket.IO is a library that enables real-time, bidirectional communication between browser and server. It uses WebSockets as the primary transport, with HTTP long-polling as a fallback.

**WebSocket vs HTTP:**
- HTTP: client sends request → server responds → connection closes
- WebSocket: persistent connection → either side can send messages at any time

**How SOCNITI uses it:**

```
Browser                          Chat Service (port 4003)
   │                                      │
   │── connect (with JWT token) ─────────►│
   │                                      │ verify JWT
   │◄─ connected ────────────────────────│
   │                                      │
   │── emit("join-event", "event-123") ──►│
   │                                      │ socket.join("event-event-123")
   │◄─ emit("message-history", [...]) ───│ send last 50 messages
   │                                      │
   │── emit("send-message", {content}) ──►│
   │                                      │ save to PostgreSQL
   │◄─ emit("new-message", msg) ─────────│ broadcast to all in room
   │                                      │
   │── emit("typing", {eventId}) ────────►│
   │                                      │ broadcast to others in room
```

**Rooms:** Socket.IO rooms are named channels. `socket.join("event-123")` subscribes to that room. `io.to("event-123").emit(...)` sends to all subscribers.

---

## 10. GraphQL & Federation

### 10.1 GraphQL Basics

GraphQL is a query language for APIs. Unlike REST (where each endpoint returns a fixed shape), GraphQL lets clients request exactly the fields they need.

```graphql
# REST: GET /api/events returns ALL fields
# GraphQL: client specifies exactly what it wants
query {
  events {
    events {
      id
      title
      city
      organizer { fullName }   # ← from Auth Service!
    }
  }
}
```

**Types of operations:**
- `Query` — read data (like GET)
- `Mutation` — write data (like POST/PUT/DELETE)
- `Subscription` — real-time updates (not used here; Socket.IO is used instead)

### 10.2 Apollo Server

Each backend service runs an Apollo Server instance. It:
1. Parses incoming GraphQL queries
2. Validates them against the schema
3. Calls the appropriate resolver functions
4. Returns the result as JSON

```js
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  formatError: (err) => ({ message: err.message, code: err.extensions?.code })
});
```

### 10.3 Apollo Federation v2

Federation allows multiple GraphQL services to act as one. Each service is a "subgraph" that:
1. Declares its own types with `@key` directives to mark entity identifiers
2. Can reference types from other subgraphs

**Example — Event references User from Auth Service:**

```graphql
# In Event Service schema:
type Event @key(fields: "id") {
  id: ID!
  title: String!
  organizerId: ID!
  organizer: User          # ← resolved by Auth Service
}

type User @key(fields: "id", resolvable: false) {
  id: ID!                  # ← just a reference, not resolved here
}
```

```graphql
# In Auth Service schema:
type User @key(fields: "id") {
  id: ID!
  fullName: String!
  email: String
  role: String!
}
```

**`__resolveReference`** — when the gateway needs to resolve a `User` from just an `id`, it calls this function in the Auth Service:
```js
User: {
  __resolveReference(user) {
    return User.findById(user.id);
  }
}
```

### 10.4 API Gateway with IntrospectAndCompose

```js
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "auth",      url: "http://localhost:4001/graphql" },
      { name: "events",    url: "http://localhost:4005/graphql" },
      { name: "chat",      url: "http://localhost:4006/graphql" },
      { name: "donations", url: "http://localhost:4008/graphql" },
    ],
    pollIntervalInMs: 5000,  // re-fetch schemas every 5 seconds
  }),
});
```

`IntrospectAndCompose` fetches each subgraph's schema via introspection and composes them. The `pollIntervalInMs` means if a service restarts with a new schema, the gateway picks it up automatically.

---

## 11. Key Libraries Explained

### nodemailer
Node.js library for sending emails via SMTP. SOCNITI uses Gmail's SMTP server:
```js
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 587, secure: false,
  auth: { user: "socniti.project@gmail.com", pass: "app-password" }
});
await transporter.sendMail({ to: email, subject: "Your OTP", text: `Code: ${otp}` });
```
The `pass` is a Gmail App Password (not the account password) — required when 2FA is enabled.

### concurrently
Runs multiple npm scripts in parallel in one terminal:
```json
"dev": "concurrently \"npm run dev --workspace @socniti/frontend\" \"npm run dev --workspace @socniti/auth-service\" ..."
```
Each service's output is color-coded and prefixed with its name.

### graphql-tag (gql)
Template literal tag that parses GraphQL schema strings into AST (Abstract Syntax Tree) objects that Apollo Server understands:
```js
const typeDefs = gql`
  type User { id: ID! fullName: String! }
`;
```

### date-fns
Functional date utility library. Used in the frontend for formatting dates:
```js
import { format } from "date-fns";
format(new Date(event.startsAt), "dd MMM yyyy")  // "15 Apr 2026"
```

### TanStack Query (React Query)
Data fetching and caching library. Manages loading/error states, background refetching, and cache invalidation. Installed but not yet fully integrated — currently direct axios calls are used in most places.

---

## 12. Data Flow Diagrams

### User Signup Flow
```
Frontend (ModernSignupPage)
  │ POST /graphql { mutation signup(...) }
  ▼
API Gateway (port 8080)
  │ routes to Auth subgraph
  ▼
Auth Service (port 4001)
  │ validates input
  │ bcrypt.hash(password)
  │ generates 6-digit OTP
  │ INSERT INTO users (verified=false, otp=...)
  │ nodemailer.sendMail(OTP to email)
  ▼
Frontend shows OTP input screen
  │ POST /graphql { mutation verifySignupOtp(email, otp) }
  ▼
Auth Service
  │ SELECT user WHERE email=...
  │ check otp matches + not expired
  │ UPDATE users SET verified=true, otp=null
  │ jwt.sign({ sub: user.id, role, ... })
  ▼
Frontend receives { token, user }
  │ localStorage.setItem("socniti_token", token)
  │ localStorage.setItem("socniti_user", JSON.stringify(user))
  ▼
AuthContext updates → user is now logged in
```

### Event Registration Flow
```
Frontend (EventDetailPage or JoinEventModal)
  │ POST http://localhost:4002/api/events/:slug/register
  │ Headers: Authorization: Bearer <JWT>
  ▼
Event Service REST (port 4002)
  │ authMiddleware: jwt.verify(token) → req.user
  │ SELECT * FROM events WHERE slug=...
  │ SELECT * FROM event_participants WHERE event_id=...
  │ check: user not already registered
  │ if currentParticipants < maxParticipants:
  │   INSERT INTO event_participants (is_waitlist=false)
  │   UPDATE events SET current_participants = current_participants + 1
  │ else:
  │   INSERT INTO event_participants (is_waitlist=true)
  │   UPDATE events SET waitlist_count = waitlist_count + 1
  ▼
Frontend updates count locally + shows "Registered" state
```

### Real-Time Chat Flow
```
Frontend (EventChat component)
  │ io("ws://localhost:4003", { auth: { token } })
  ▼
Chat Service Socket.IO server
  │ io.use middleware: jwt.verify(token) → socket.userId, socket.username
  │ socket.on("join-event", eventId):
  │   socket.join("event-" + eventId)
  │   SELECT messages WHERE event_id=... LIMIT 50
  │   socket.emit("message-history", messages)
  │
  │ socket.on("send-message", { eventId, content }):
  │   INSERT INTO messages (event_id, sender_id, content, ...)
  │   io.to("event-" + eventId).emit("new-message", savedMessage)
  ▼
All connected clients in the room receive the message instantly
```

---

## 13. Environment Configuration

All environment variables are stored in `.env` at the project root. Each service loads it with:
```js
dotenv.config({ path: "../../.env" });  // relative path from service directory
dotenv.config();                         // fallback: look in current directory
```

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | All services | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Auth, Event, Chat, Donation | Signs and verifies JWT tokens — must be the same across all services |
| `JWT_EXPIRES_IN` | Auth | Token expiry duration (e.g., "7d") |
| `SMTP_HOST` | Auth | Email server hostname |
| `SMTP_PORT` | Auth | Email server port (587 for TLS) |
| `SMTP_USER` | Auth | Gmail address for sending OTPs |
| `SMTP_PASS` | Auth | Gmail App Password |
| `CLIENT_URL` | Gateway | Allowed CORS origin |
| `AUTH_SERVICE_PORT` | Auth | Port 4001 |
| `EVENT_SERVICE_PORT` | Event | Port 4002 |
| `CHAT_SERVICE_PORT` | Chat | Port 4003 |
| `DONATION_SERVICE_PORT` | Donation | Port 4007 |
| `GATEWAY_PORT` | Gateway | Port 8080 |

---

## 14. Running the Project

### Prerequisites
- Node.js v18 or higher
- npm v8 or higher
- Internet access (for Supabase connection)

### Install dependencies
```bash
npm install
```
This installs all dependencies for all workspaces (frontend + all services) in one command.

### Start all services
```bash
# Start auth, event, chat, gateway, frontend together:
npm run dev

# Start donation service separately (not in main dev script):
cd services/donation-service && npm run dev
```

### Individual service commands
```bash
npm run dev:frontend   # Frontend only (port 5173)
npm run dev:gateway    # API Gateway only (port 8080)
npm run dev:auth       # Auth Service only (port 4001)
npm run dev:events     # Event Service only (port 4002, 4005)
npm run dev:chat       # Chat Service only (port 4003, 4006)
```

### Service startup order
Services must start before the gateway can compose their schemas:
1. Auth Service (4001)
2. Event Service (4002, 4005)
3. Chat Service (4003, 4006)
4. Donation Service (4007, 4008)
5. API Gateway (8080) — waits for all subgraphs
6. Frontend (5173)

The gateway polls every 5 seconds, so if a service starts late it will be picked up automatically.

### Verify everything is running
```
http://localhost:5173/          ← Frontend
http://localhost:8080/          ← GraphQL Playground (API Gateway)
http://localhost:4002/health    ← Event Service health check
http://localhost:4003/health    ← Chat Service health check
http://localhost:4007/health    ← Donation Service health check
```

### Test the auth flow via GraphQL Playground
Open `http://localhost:8080/` and run:
```graphql
mutation {
  signup(
    fullName: "Test User"
    username: "testuser"
    email: "your@email.com"
    password: "test1234"
    role: "user"
  ) {
    success
    message
  }
}
```
Check your email (or the auth service console) for the OTP, then:
```graphql
mutation {
  verifySignupOtp(email: "your@email.com", otp: "123456") {
    token
    user { id username fullName role }
  }
}
```

---

*Document generated: May 2026 | SOCNITI v1.0*
