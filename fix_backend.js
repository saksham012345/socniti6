const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, "apps", "backend");
const SERVICES_DIR = path.join(ROOT_DIR, "services");

console.log("🔧 Fixing backend paths and resolvers...");

// 1. Copy the schemas and resolvers from auth and event to the monolith so we don't rely on the old folder
fs.copyFileSync(
  path.join(SERVICES_DIR, "auth-service", "src", "schema.js"),
  path.join(BACKEND_DIR, "src", "graphql", "authSchema.js")
);
fs.copyFileSync(
  path.join(SERVICES_DIR, "auth-service", "src", "resolvers.js"),
  path.join(BACKEND_DIR, "src", "graphql", "authResolvers.js")
);

if (fs.existsSync(path.join(SERVICES_DIR, "event-service", "src", "graphql", "schema.js"))) {
  fs.copyFileSync(
    path.join(SERVICES_DIR, "event-service", "src", "graphql", "schema.js"),
    path.join(BACKEND_DIR, "src", "graphql", "eventSchema.js")
  );
  fs.copyFileSync(
    path.join(SERVICES_DIR, "event-service", "src", "graphql", "resolvers.js"),
    path.join(BACKEND_DIR, "src", "graphql", "eventResolvers.js")
  );
}

// 2. We extract the chat and donation resolvers properly by reading the files
const chatCode = fs.readFileSync(path.join(SERVICES_DIR, "chat-service", "src", "index.js"), "utf8");
const donCode = fs.readFileSync(path.join(SERVICES_DIR, "donation-service", "src", "index.js"), "utf8");

const extractResolvers = (code) => {
  const match = code.match(/const resolvers = {([\s\S]*?)};\n\nconst server/);
  return match ? `const resolvers = {${match[1]}};` : "const resolvers = {};";
};

const extractSchema = (code) => {
  const match = code.match(/const typeDefs = parse\([\s\S]*?`\);/);
  return match ? match[0] : "const typeDefs = parse(`type Query { _ping: String }`);";
};

const chatSchema = extractSchema(chatCode).replace("const typeDefs =", "const chatTypeDefs =");
const chatResolvers = extractResolvers(chatCode).replace("const resolvers =", "const chatResolvers =");

const donSchema = extractSchema(donCode).replace("const typeDefs =", "const donTypeDefs =");
const donResolvers = extractResolvers(donCode).replace("const resolvers =", "const donResolvers =");

// 3. Write the fixed graphql/index.js
const graphqlIndexCode = `
const { mergeTypeDefs, mergeResolvers } = require("@graphql-tools/merge");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { parse } = require("graphql");

const authTypeDefs = require("./authSchema.js");
const authResolvers = require("./authResolvers.js");

let eventTypeDefs = "";
let eventResolvers = {};
try {
  eventTypeDefs = require("./eventSchema.js");
  eventResolvers = require("./eventResolvers.js");
} catch(e) {}

${chatSchema}
${chatResolvers}

${donSchema}
${donResolvers}

const federationDirectives = parse(\`
  directive @key(fields: String!, resolvable: Boolean) on OBJECT | INTERFACE
  directive @link(url: String, import: [String]) on SCHEMA
  directive @shareable on FIELD_DEFINITION | OBJECT
\`);

const typeDefs = mergeTypeDefs([
  federationDirectives,
  authTypeDefs,
  eventTypeDefs || "type Query { _eventPing: String }",
  chatTypeDefs,
  donTypeDefs
]);

const resolvers = mergeResolvers([
  authResolvers,
  eventResolvers || {},
  chatResolvers,
  donResolvers
]);

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = { schema };
`;

fs.writeFileSync(path.join(BACKEND_DIR, "src", "graphql", "index.js"), graphqlIndexCode);

// 4. Fix index.js routing path
let indexCode = fs.readFileSync(path.join(BACKEND_DIR, "src", "index.js"), "utf8");
indexCode = indexCode.replace("../../services/event-service/src/routes/eventRoutes", "../routes/eventRoutes");
fs.writeFileSync(path.join(BACKEND_DIR, "src", "index.js"), indexCode);

console.log("✅ Fixed GraphQL schema, resolvers, and routing paths!");
