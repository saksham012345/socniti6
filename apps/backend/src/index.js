const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");

dotenv.config({ path: "../../.env" });
dotenv.config();

const { connectDb, runMigrations } = require("./db");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const eventRoutes = require("./routes/eventRoutes");
const donationRoutes = require("./routes/donationRoutes");
const Message = require("./models/Message");

const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const PORT = process.env.PORT || 8080;

// Build CORS origin list from CLIENT_URL env (supports comma-separated list)
const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || "";
  const origins = raw.split(",").map(o => o.trim()).filter(Boolean);
  // Always allow localhost in development
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:5173", "http://localhost:3000");
  }
  return origins.length > 0 ? origins : "*";
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowed === "*") return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-apollo-operation-name", "apollo-require-preflight"],
};

async function start() {
  // ── DB ──────────────────────────────────────────────────────────
  await connectDb();
  await runMigrations();

  // ── Express ─────────────────────────────────────────────────────
  const app = express();
  const httpServer = createServer(app);

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions)); // pre-flight for all routes
  app.use(express.json({ limit: "2mb" }));

  // ── Socket.IO ───────────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  const activeUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.sub || decoded.id;
      socket.username = decoded.username;
      next();
    } catch { next(new Error("Invalid token")); }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.username}`);
    activeUsers.set(socket.userId, { socketId: socket.id, username: socket.username, userId: socket.userId });

    socket.on("join-event", async (eventId) => {
      socket.join(`event-${eventId}`);
      socket.to(`event-${eventId}`).emit("user-joined", { userId: socket.userId, username: socket.username });
      try {
        const messages = await Message.find({ eventId }, { limit: 50, sort: { createdAt: 1 } });
        socket.emit("message-history", messages);
      } catch (err) { console.error("Fetch messages error:", err.message); }
    });

    socket.on("leave-event", (eventId) => {
      socket.leave(`event-${eventId}`);
      socket.to(`event-${eventId}`).emit("user-left", { userId: socket.userId, username: socket.username });
    });

    socket.on("send-message", async ({ eventId, content }) => {
      if (!content?.trim()) return socket.emit("error", { message: "Empty message" });
      try {
        const message = await Message.create({ eventId, senderId: socket.userId, senderName: socket.username, content: content.trim(), type: "text" });
        io.to(`event-${eventId}`).emit("new-message", { id: message.id, eventId: message.eventId, senderId: message.senderId, senderName: message.senderName, content: message.content, type: message.type, createdAt: message.createdAt });
      } catch (err) { socket.emit("error", { message: "Failed to send" }); }
    });

    socket.on("typing", ({ eventId }) => socket.to(`event-${eventId}`).emit("user-typing", { userId: socket.userId, username: socket.username }));
    socket.on("stop-typing", ({ eventId }) => socket.to(`event-${eventId}`).emit("user-stop-typing", { userId: socket.userId }));
    socket.on("disconnect", () => { activeUsers.delete(socket.userId); console.log(`❌ Socket disconnected: ${socket.username}`); });
  });

  // ── Apollo GraphQL ──────────────────────────────────────────────
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (err) => { console.error("GraphQL Error:", err.message); return { message: err.message, code: err.extensions?.code || "INTERNAL_SERVER_ERROR" }; },
  });
  await apollo.start();

  app.use("/graphql", expressMiddleware(apollo, {
    context: async ({ req }) => {
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      if (!token) return { user: null };
      try { return { user: jwt.verify(token, JWT_SECRET) }; }
      catch { return { user: null }; }
    }
  }));

  // ── REST Routes ─────────────────────────────────────────────────
  app.use("/api/events", eventRoutes);
  app.use("/api/donations", donationRoutes);

  app.get("/health", (_, res) => res.json({ status: "ok", service: "socniti-backend", port: PORT, activeUsers: activeUsers.size }));

  // ── Start ───────────────────────────────────────────────────────
  httpServer.listen(PORT, () => {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 SOCNITI MONOLITH READY");
    console.log("=".repeat(60));
    console.log(`📍 GraphQL:   http://localhost:${PORT}/graphql`);
    console.log(`📍 REST:      http://localhost:${PORT}/api/events`);
    console.log(`📍 WebSocket: ws://localhost:${PORT}`);
    console.log(`📍 Health:    http://localhost:${PORT}/health`);
    console.log("=".repeat(60) + "\n");
  });
}

start().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
