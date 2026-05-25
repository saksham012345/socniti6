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
const ticketRoutes = require("./routes/ticketRoutes");
const Message = require("./models/Message");
const TicketMessage = require("./models/TicketMessage");

const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const PORT = process.env.PORT || 8080;

// CORS — allow all Vercel preview URLs + explicit CLIENT_URL list
const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || "";
  const explicit = raw.split(",").map(o => o.trim()).filter(Boolean);
  return explicit;
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (process.env.NODE_ENV !== "production") return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return true;
  return getAllowedOrigins().includes(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);

    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-apollo-operation-name",
    "apollo-require-preflight",
  ],
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
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        console.warn(`Socket.IO CORS blocked: ${origin}`);
        callback(new Error(`Socket.IO CORS: origin ${origin} not allowed`));
      },
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
      socket.userRole = ["admin", "agent"].includes(decoded.role) ? decoded.role : "user";
      next();
    } catch { next(new Error("Invalid token")); }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.username}`);
    activeUsers.set(socket.userId, { socketId: socket.id, username: socket.username, userId: socket.userId });
    if (["admin", "agent"].includes(socket.userRole)) socket.join("ticket-agents");

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
    socket.on("join-ticket", async (ticketId) => {
      socket.join(`ticket-${ticketId}`);
      try {
        const messages = await TicketMessage.findByTicketId(ticketId);
        socket.emit("ticket-message-history", messages);
      } catch {
        socket.emit("error", { message: "Failed to load ticket messages" });
      }
    });
    socket.on("ticket-message", ({ ticketId, message }) => {
      if (ticketId && message) socket.to(`ticket-${ticketId}`).emit("ticket-message", message);
    });
    socket.on("send-ticket-message", async ({ ticketId, content }) => {
      if (!ticketId || !content?.trim()) return socket.emit("error", { message: "Message is required" });
      try {
        const message = await TicketMessage.create({
          ticketId,
          senderId: socket.userId,
          senderName: socket.username,
          senderRole: socket.userRole,
          content: content.trim()
        });
        io.to(`ticket-${ticketId}`).emit("ticket-message", message);
      } catch {
        socket.emit("error", { message: "Failed to send ticket message" });
      }
    });
    socket.on("disconnect", () => { activeUsers.delete(socket.userId); console.log(`❌ Socket disconnected: ${socket.username}`); });
  });
  app.set("io", io);

  // ── Apollo GraphQL ──────────────────────────────────────────────
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // keep enabled so playground works
    formatError: (err) => { console.error("GraphQL Error:", err.message); return { message: err.message, code: err.extensions?.code || "INTERNAL_SERVER_ERROR" }; },
  });
  await apollo.start();

  app.use(
    "/graphql",
    cors(corsOptions), // apply CORS specifically to /graphql too
    express.json({ limit: "2mb" }),
    expressMiddleware(apollo, {
      context: async ({ req }) => {
        const token = (req.headers.authorization || "").replace("Bearer ", "");
        if (!token) return { user: null };
        try { return { user: jwt.verify(token, JWT_SECRET) }; }
        catch { return { user: null }; }
      }
    })
  );

  // ── REST Routes ─────────────────────────────────────────────────
  app.use("/api/events", eventRoutes);
  app.use("/api/donations", donationRoutes);
  app.use("/api/tickets", ticketRoutes);

  app.get("/health", (_, res) => res.json({ status: "ok", service: "socniti-backend", port: PORT, activeUsers: activeUsers.size }));

  // Keep-alive: ping self every 14 minutes to prevent Render free tier cold starts
  if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
    const keepAliveUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
    setInterval(async () => {
      try {
        const https = require("https");
        https.get(keepAliveUrl, (res) => {
          console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
        }).on("error", (err) => {
          console.warn("Keep-alive ping failed:", err.message);
        });
      } catch (err) {
        console.warn("Keep-alive error:", err.message);
      }
    }, 14 * 60 * 1000); // every 14 minutes
    console.log(`🏓 Keep-alive enabled → ${keepAliveUrl}`);
  }

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
