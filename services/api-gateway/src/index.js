const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { ApolloGateway, IntrospectAndCompose } = require("@apollo/gateway");
const dotenv = require("dotenv");

dotenv.config();

const port = process.env.PORT || 8080;

console.log("🔄 Starting API Gateway...");
// GraphQL Federation Gateway

// URLs for subgraphs (Railway / Prod / Dev)
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:4001/graphql";
const eventServiceUrl = process.env.EVENT_SERVICE_URL || "http://localhost:4005/graphql";
const chatServiceUrl = process.env.CHAT_SERVICE_URL || "http://localhost:4006/graphql";
const donationServiceUrl = process.env.DONATION_SERVICE_URL || "http://localhost:4008/graphql";

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "auth", url: authServiceUrl },
      { name: "events", url: eventServiceUrl },
      { name: "chat", url: chatServiceUrl },
      { name: "donations", url: donationServiceUrl },
    ],
    pollIntervalInMs: 5000,
  }),
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
  formatError: (formattedError) => {
    console.error("🔴 Gateway Error:", formattedError.message);
    return formattedError;
  },
});

startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => {
    return {
      headers: req.headers,
    };
  },
}).then(({ url }) => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 API GATEWAY READY");
  console.log("=".repeat(60));
  console.log(`📍 GraphQL Endpoint: ${url}`);
  console.log(`📍 GraphQL Playground: ${url}`);
  console.log(`📡 CORS: Enabled for all origins (dev mode)`);
  console.log("\n🔗 Connected Subgraphs:");
  console.log(`  • Auth Service: ${authServiceUrl}`);
  console.log(`  • Event Service: ${eventServiceUrl}`);
  console.log(`  • Chat Service: ${chatServiceUrl}`);
  console.log(`  • Donation Service: ${donationServiceUrl}`);
  console.log("=".repeat(60) + "\n");
}).catch((err) => {
  console.error("\n" + "=".repeat(60));
  console.error("❌ API GATEWAY FAILED TO START");
  console.error("=".repeat(60));
  console.error("Error:", err.message);
  console.error("\n💡 Possible solutions:");
  console.error(`  1. Check if port ${port} is already in use`);
  console.error("  2. Ensure all subgraph services are running:");
  console.error(`     - Auth Service (${authServiceUrl})`);
  console.error(`     - Event Service (${eventServiceUrl})`);
  console.error(`     - Chat Service (${chatServiceUrl})`);
  console.error(`     - Donation Service (${donationServiceUrl})`);
  console.error("  3. Check network connectivity");
  console.error("=".repeat(60) + "\n");
  process.exit(1);
});
