const { connectDb: pgConnect, runMigrations } = require("@socniti/shared");

const connectDb = async () => {
  await pgConnect();
  await runMigrations();
};

module.exports = connectDb;
