const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const SERVICES_DIR = path.join(ROOT_DIR, "services");
const BACKEND_DIR = path.join(ROOT_DIR, "apps", "backend");

// Helpers
function mkdirP(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    mkdirP(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("🚀 Starting migration to Monolith...");

// 1. Create Directories
mkdirP(path.join(BACKEND_DIR, "src", "models"));
mkdirP(path.join(BACKEND_DIR, "src", "graphql"));
mkdirP(path.join(BACKEND_DIR, "src", "routes"));
mkdirP(path.join(BACKEND_DIR, "src", "controllers"));
mkdirP(path.join(BACKEND_DIR, "src", "middleware"));
mkdirP(path.join(BACKEND_DIR, "src", "utils"));
mkdirP(path.join(BACKEND_DIR, "src", "config"));

// 2. Copy Models
const services = ["auth-service", "event-service", "chat-service", "donation-service"];
services.forEach((service) => {
  const modelsDir = path.join(SERVICES_DIR, service, "src", "models");
  if (fs.existsSync(modelsDir)) {
    fs.readdirSync(modelsDir).forEach((file) => {
      fs.copyFileSync(path.join(modelsDir, file), path.join(BACKEND_DIR, "src", "models", file));
      console.log(`✅ Copied model: ${file} from ${service}`);
    });
  }
});

// 3. Copy other logic (routes, controllers, etc. for event and chat)
["event-service", "chat-service", "donation-service"].forEach(service => {
  ["routes", "controllers", "middleware", "utils", "config"].forEach(folder => {
    const src = path.join(SERVICES_DIR, service, "src", folder);
    const dest = path.join(BACKEND_DIR, "src", folder);
    if (fs.existsSync(src)) copyRecursiveSync(src, dest);
  });
});

// 4. Generate apps/backend/package.json
const packageJson = {
  name: "@socniti/backend",
  version: "1.0.0",
  main: "src/index.js",
  scripts: {
    dev: "nodemon src/index.js",
    start: "node src/index.js"
  },
  dependencies: {
    "@apollo/server": "^4.11.3",
    "@graphql-tools/merge": "^9.0.0",
    "@graphql-tools/schema": "^10.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "graphql": "^16.10.0",
    "mongoose": "^8.9.5",
    "socket.io": "^4.8.1",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.7"
  },
  devDependencies: {
    "nodemon": "^3.1.9"
  }
};
fs.writeFileSync(path.join(BACKEND_DIR, "package.json"), JSON.stringify(packageJson, null, 2));

// 5. Update Root package.json
const rootPackageJsonPath = path.join(ROOT_DIR, "package.json");
if (fs.existsSync(rootPackageJsonPath)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"));
  rootPkg.workspaces = ["apps/*", "packages/*"];
  rootPkg.scripts.dev = "concurrently \"npm run dev --workspace @socniti/frontend\" \"npm run dev --workspace @socniti/backend\"";
  rootPkg.scripts["dev:backend"] = "npm run dev --workspace @socniti/backend";
  delete rootPkg.scripts["dev:gateway"];
  delete rootPkg.scripts["dev:auth"];
  delete rootPkg.scripts["dev:events"];
  delete rootPkg.scripts["dev:chat"];
  delete rootPkg.scripts["dev:donation"];
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPkg, null, 2));
  console.log("✅ Updated root package.json");
}

console.log(`
🎉 Migration script finished moving files!
Next steps:
1. We need to create apps/backend/src/index.js manually (which I will do).
2. We need to manually adjust the GraphQL imports.
`);
