const { query } = require("@socniti/shared");

const Ticket = {
  async find(conditions = {}) {
    let where = "1=1";
    const values = [];
    let i = 1;

    if (conditions.userId) {
      values.push(conditions.userId);
      where += ` AND user_id = $${i++}`;
    }
    if (conditions.status) {
      values.push(conditions.status);
      where += ` AND status = $${i++}`;
    }

    const res = await query(
      `SELECT * FROM tickets WHERE ${where} ORDER BY created_at DESC`,
      values
    );
    return res.rows.map(_format);
  },

  async findById(id) {
    const res = await query("SELECT * FROM tickets WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async create(data) {
    const res = await query(
      `INSERT INTO tickets (user_id, user_name, subject, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userId, data.userName, data.subject, data.status || "open"]
    );
    return _format(res.rows[0]);
  },

  async update(id, data) {
    const sets = [];
    const values = [];
    let i = 1;
    
    if (data.status) {
      sets.push(`status = $${i++}`);
      values.push(data.status);
    }
    sets.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query(
      `UPDATE tickets SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  }
};

function _format(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = Ticket;
