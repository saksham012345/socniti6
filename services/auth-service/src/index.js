const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const dotenv = require("dotenv");

dotenv.config({ path: "../../.env" });
dotenv.config();

const { connectDb, runMigrations } = require("@socniti/shared");
const typeDefs = require("./schema");
const resolvers = require("./resolvers");

async function startServer() {
  const PORT = 4001;
  console.log("🔄 Starting Auth Service...");

  try {
    await connectDb();
    await runMigrations();
  } catch (error) {
    console.error("❌ DATABASE CONNECTION FAILED:", error.message);
    process.exit(1);
  }

  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    formatError: (formattedError) => {
      console.error("🔴 GraphQL Error:", formattedError.message);
      return {
        message: formattedError.message,
        code: formattedError.extensions?.code || "INTERNAL_SERVER_ERROR",
        path: formattedError.path,
      };
    },
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
    context: async ({ req }) => ({ req }),
  });

  console.log("=".repeat(60));
  console.log("🚀 AUTH SERVICE READY");
  console.log("=".repeat(60));
  console.log(`📍 GraphQL Endpoint: ${url}`);
  console.log(`🗄️  Database: Supabase PostgreSQL`);
  console.log("=".repeat(60));
}

startServer().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
