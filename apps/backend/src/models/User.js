const { query } = require("../db");

function _format(row) {
  const user = {
    id: row.id, _id: row.id,
    fullName: row.full_name, username: row.username,
    email: row.email, phone: row.phone, password: row.password,
    role: row.role, verified: row.verified,
    bio: row.bio, location: row.location, avatarUrl: row.avatar_url,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
  user.save = async () => { const u = await User._save(user); Object.assign(user, u); return user; };
  return user;
}

function _col(key) {
  const map = { id: "id", _id: "id", fullName: "full_name", username: "username", email: "email", phone: "phone", password: "password", role: "role", verified: "verified" };
  return map[key] || key;
}

const User = {
  async findById(id) {
    const res = await query("SELECT * FROM users WHERE id=$1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },
  async findOne(conditions) {
    const keys = Object.keys(conditions);
    if (!keys.length) return null;
    const clauses = keys.map((k, i) => `${_col(k)}=$${i + 1}`).join(" AND ");
    const res = await query(`SELECT * FROM users WHERE ${clauses} LIMIT 1`, keys.map(k => conditions[k]));
    return res.rows[0] ? _format(res.rows[0]) : null;
  },
  async find(conditions = {}) {
    const keys = Object.keys(conditions);
    if (!keys.length) {
      const res = await query("SELECT * FROM users ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${_col(k)}=$${i + 1}`).join(" AND ");
    const res = await query(`SELECT * FROM users WHERE ${clauses}`, keys.map(k => conditions[k]));
    return res.rows.map(_format);
  },
  async create(data) {
    const res = await query(
      `INSERT INTO users (full_name,username,email,phone,password,role,verified,bio,location,avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [data.fullName, data.username, data.email||null, data.phone||null, data.password||null,
       data.role||"user", data.verified??true, data.bio||null, data.location||null, data.avatarUrl||null]
    );
    return _format(res.rows[0]);
  },
  async _save(user) {
    const res = await query(
      `UPDATE users SET full_name=$1,username=$2,email=$3,phone=$4,password=$5,role=$6,verified=$7,
       bio=$8,location=$9,avatar_url=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,
      [user.fullName,user.username,user.email,user.phone,user.password,user.role,user.verified,
       user.bio||null,user.location||null,user.avatarUrl||null,user.id]
    );
    return _format(res.rows[0]);
  }
};

module.exports = User;
