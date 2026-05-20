const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}

async function connectDb() {
  const client = getPool();
  const res = await client.query("SELECT NOW()");
  console.log("✅ PostgreSQL connected:", res.rows[0].now);
  return client;
}

module.exports = { getPool, query, connectDb };
