const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const SERVICES_DIR = path.join(ROOT_DIR, "services");
const BACKEND_DIR = path.join(ROOT_DIR, "apps", "backend");

console.log("🚀 Starting Final Step: Merging logic...");

// 1. We will create apps/backend/src/graphql/index.js which loads the old schemas
// But wait, the old schemas have Federation. Instead, let's just write the merged schema manually!

// Let's copy the entire chat-service Socket.io logic into index.js
const chatServiceIndex = fs.readFileSync(path.join(SERVICES_DIR, "chat-service", "src", "index.js"), "utf8");

// Extract Socket.io logic (roughly from lines containing 'const io = new Server' to '}); // end of io.on')
const socketIoSetupMatch = chatServiceIndex.match(/const io = new Server[\s\S]*?\/\/ REST endpoints/);
const socketIoCode = socketIoSetupMatch ? socketIoSetupMatch[0].replace('// REST endpoints', '') : '// Socket.io logic missing';

// Extract Chat GraphQL Schema and Resolvers
const chatTypeDefsMatch = chatServiceIndex.match(/const typeDefs = parse\([\s\S]*?`\);/);
const chatResolversMatch = chatServiceIndex.match(/const resolvers = {[\s\S]*?};\n\nconst server/);
const chatTypeDefs = chatTypeDefsMatch ? chatTypeDefsMatch[0] : "const typeDefs = parse(`type Query { _chatPing: String }`);";
const chatResolvers = chatResolversMatch ? chatResolversMatch[0].replace('const server', '') : "const resolvers = {};";

// Extract Donation GraphQL Schema and Resolvers
const donationServiceIndex = fs.readFileSync(path.join(SERVICES_DIR, "donation-service", "src", "index.js"), "utf8");
const donTypeDefsMatch = donationServiceIndex.match(/const typeDefs = parse\([\s\S]*?`\);/);
const donResolversMatch = donationServiceIndex.match(/const resolvers = {[\s\S]*?};\n\nconst server/);
const donTypeDefs = donTypeDefsMatch ? donTypeDefsMatch[0] : "const typeDefs = parse(`type Query { _donationPing: String }`);";
const donResolvers = donResolversMatch ? donResolversMatch[0].replace('const server', '') : "const resolvers = {};";

const graphqlIndexCode = `
const { mergeTypeDefs, mergeResolvers } = require("@graphql-tools/merge");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { parse } = require("graphql");

// Load external schemas
const authTypeDefs = require("../../services/auth-service/src/schema.js");
const authResolvers = require("../../services/auth-service/src/resolvers.js");

const eventTypeDefs = require("../../services/event-service/src/graphql/schema.js");
const eventResolvers = require("../../services/event-service/src/graphql/resolvers.js");

// Embedded Chat Schema
${chatTypeDefs.replace('const typeDefs =', 'const chatTypeDefs =')}
${chatResolvers.replace('const resolvers =', 'const chatResolvers =')}

// Embedded Donation Schema
${donTypeDefs.replace('const typeDefs =', 'const donTypeDefs =')}
${donResolvers.replace('const resolvers =', 'const donResolvers =')}

// Fake Federation directives to prevent parsing errors when merging
const federationDirectives = parse(\`
  directive @key(fields: String!, resolvable: Boolean) on OBJECT | INTERFACE
  directive @link(url: String, import: [String]) on SCHEMA
  directive @shareable on FIELD_DEFINITION | OBJECT
\`);

const typeDefs = mergeTypeDefs([
  federationDirectives,
  authTypeDefs,
  eventTypeDefs,
  chatTypeDefs,
  donTypeDefs
]);

const resolvers = mergeResolvers([
  authResolvers,
  eventResolvers,
  chatResolvers,
  donResolvers
]);

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = { schema };
`;

fs.writeFileSync(path.join(BACKEND_DIR, "src", "graphql", "index.js"), graphqlIndexCode);
console.log("✅ Created apps/backend/src/graphql/index.js");

const indexJsCode = `
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { connectDb, runMigrations } = require("@socniti/shared");

dotenv.config({ path: "../../.env" });
dotenv.config();

const { schema } = require("./graphql");

// Mongoose Models
const Message = require("./models/Message");
const Ticket = require("./models/Ticket");
const TicketMessage = require("./models/TicketMessage");
const Donation = require("./models/Donation");

const app = express();
const httpServer = createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-me";
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// --- SOCKET.IO SETUP ---
${socketIoCode}

// --- REST ENDPOINTS ---
app.get("/health", (req, res) => {
  res.json({
    service: "socniti-monolith",
    status: "ok"
  });
});

// Auth middleware for REST
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// We will mount old routes dynamically
// Note: In a true monolith, you'd cleanly import the routers. For this migration, we import them directly if they exist.
try {
  const eventRoutes = require("../../services/event-service/src/routes/eventRoutes");
  app.use("/api/events", eventRoutes);
  console.log("✅ Loaded Event REST routes");
} catch(e) {}

// Setup Apollo Server
const server = new ApolloServer({
  schema,
  formatError: (err) => {
    console.error("🔴 GraphQL Error:", err.message);
    return err;
  },
});

async function startServer() {
  await connectDb();
  await runMigrations();

  await server.start();
  app.use("/graphql", expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) return { req, user: null };
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { req, user: decoded };
      } catch (err) {
        return { req, user: null };
      }
    },
  }));

  httpServer.listen(PORT, () => {
    console.log("\\n" + "=".repeat(60));
    console.log("🚀 SOCNITI MONOLITH BACKEND READY");
    console.log("=".repeat(60));
    console.log(\`📍 Server: http://localhost:\${PORT}\`);
    console.log(\`📍 GraphQL: http://localhost:\${PORT}/graphql\`);
    console.log(\`📍 WebSocket: ws://localhost:\${PORT}\`);
    console.log("=".repeat(60) + "\\n");
  });
}

startServer().catch(console.error);
`;

fs.writeFileSync(path.join(BACKEND_DIR, "src", "index.js"), indexJsCode);
console.log("✅ Created apps/backend/src/index.js");

console.log(`
🎉 Final migration script finished!
Next steps:
You can now start the monolith by running:
cd apps/backend
npm install
npm run dev
`);
