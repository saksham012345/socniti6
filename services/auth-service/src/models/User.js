const { query } = require("@socniti/shared");

// PostgreSQL-backed User model (replaces Mongoose)
const User = {
  async findById(id) {
    const res = await query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async findOne(conditions) {
    const keys = Object.keys(conditions);
    if (keys.length === 0) return null;
    const clauses = keys.map((k, i) => `${_col(k)} = $${i + 1}`).join(" AND ");
    const values = keys.map(k => conditions[k]);
    const res = await query(`SELECT * FROM users WHERE ${clauses} LIMIT 1`, values);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async find(conditions = {}) {
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      const res = await query("SELECT * FROM users ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${_col(k)} = $${i + 1}`).join(" AND ");
    const values = keys.map(k => conditions[k]);
    const res = await query(`SELECT * FROM users WHERE ${clauses}`, values);
    return res.rows.map(_format);
  },

  async create(data) {
    const res = await query(
      `INSERT INTO users (full_name, username, email, phone, password, role, verified, otp, otp_expires, bio, location, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.fullName, data.username, data.email || null, data.phone || null,
        data.password || null, data.role || "user", data.verified ?? false,
        data.otp || null, data.otpExpires || null,
        data.bio || null, data.location || null, data.avatarUrl || null
      ]
    );
    return _format(res.rows[0]);
  },

  // Instance-style save (called on objects returned by findOne/findById)
  async _save(user) {
    const res = await query(
      `UPDATE users SET
        full_name=$1, username=$2, email=$3, phone=$4, password=$5,
        role=$6, verified=$7, otp=$8, otp_expires=$9,
        bio=$10, location=$11, avatar_url=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [
        user.fullName, user.username, user.email, user.phone, user.password,
        user.role, user.verified, user.otp || null, user.otpExpires || null,
        user.bio || null, user.location || null, user.avatarUrl || null,
        user.id
      ]
    );
    return _format(res.rows[0]);
  }
};

// Map snake_case DB columns → camelCase + add .save() method
function _format(row) {
  const user = {
    id: row.id,
    _id: row.id, // backward compat
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    password: row.password,
    role: row.role,
    verified: row.verified,
    otp: row.otp,
    otpExpires: row.otp_expires,
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Attach save() so resolvers can call user.save()
  user.save = async () => {
    const updated = await User._save(user);
    Object.assign(user, updated);
    return user;
  };

  return user;
}

function _col(key) {
  const map = {
    id: "id", _id: "id", fullName: "full_name", username: "username",
    email: "email", phone: "phone", password: "password", role: "role",
    verified: "verified", otp: "otp", otpExpires: "otp_expires"
  };
  return map[key] || key;
}

module.exports = User;
