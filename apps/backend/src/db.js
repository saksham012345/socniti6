const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    pool.on("error", (err) => console.error("PG pool error:", err.message));
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function connectDb() {
  const res = await getPool().query("SELECT NOW()");
  console.log("✅ PostgreSQL connected:", res.rows[0].now);
}

async function runMigrations() {
  const pool = getPool();
  console.log("🔄 Running migrations...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','organizer','admin')),
      verified BOOLEAN NOT NULL DEFAULT false,
      otp TEXT,
      otp_expires TIMESTAMPTZ,
      bio TEXT,
      location TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      organizer_id TEXT NOT NULL,
      organizer_name TEXT DEFAULT '',
      location_name TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      lat DOUBLE PRECISION NOT NULL DEFAULT 0,
      lng DOUBLE PRECISION NOT NULL DEFAULT 0,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ,
      max_participants INT NOT NULL DEFAULT 50,
      current_participants INT NOT NULL DEFAULT 0,
      waitlist_count INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('pending','upcoming','ongoing','completed','cancelled')),
      donation_needs JSONB DEFAULT '[]',
      average_rating DOUBLE PRECISION DEFAULT 0,
      total_reviews INT DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_qr TEXT;`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_verified BOOLEAN NOT NULL DEFAULT false;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      note TEXT DEFAULT '',
      is_waitlist BOOLEAN NOT NULL DEFAULT false,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','system')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS donations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id TEXT NOT NULL,
      donor_id TEXT NOT NULL,
      donor_name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      item TEXT,
      quantity INT,
      type TEXT NOT NULL CHECK (type IN ('monetary','item')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled')),
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_donations_event_id ON donations(event_id);
    CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT,
      subject TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','waiting','resolved','closed')),
      assigned_to TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT DEFAULT 'user' CHECK (sender_role IN ('user','agent','admin')),
      content TEXT NOT NULL,
      attachment_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_verification (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      verified_by TEXT,
      verification_notes TEXT,
      rejection_reason TEXT,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id)
    );
    CREATE INDEX IF NOT EXISTS idx_event_verification_status ON event_verification(status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS donation_settlements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id TEXT NOT NULL,
      total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      settled_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      pending_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending','partial','settled')),
      last_settlement_date TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_settlements_event_id ON donation_settlements(event_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_status ON donation_settlements(settlement_status);
  `);

  console.log("✅ Migrations complete");
}

module.exports = { query, connectDb, runMigrations };
