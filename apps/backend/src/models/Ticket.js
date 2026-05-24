const { query } = require("../db");

function _format(row) {
  return {
    id: row.id,
    _id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const Ticket = {
  async find(conditions = {}) {
    const colMap = {
      userId: "user_id",
      status: "status",
      priority: "priority",
      assignedTo: "assigned_to"
    };
    const keys = Object.keys(conditions);
    if (!keys.length) {
      const res = await query("SELECT * FROM tickets ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${colMap[k] || k}=$${i + 1}`).join(" AND ");
    const res = await query(
      `SELECT * FROM tickets WHERE ${clauses} ORDER BY created_at DESC`,
      keys.map(k => conditions[k])
    );
    return res.rows.map(_format);
  },

  async findById(id) {
    const res = await query("SELECT * FROM tickets WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async create(data) {
    const res = await query(
      `INSERT INTO tickets (user_id, user_name, user_email, subject, description, priority, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.userId,
        data.userName,
        data.userEmail || null,
        data.subject,
        data.description || null,
        data.priority || "medium",
        data.status || "open",
        data.assignedTo || null
      ]
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
    if (data.priority) {
      sets.push(`priority = $${i++}`);
      values.push(data.priority);
    }
    if (data.subject) {
      sets.push(`subject = $${i++}`);
      values.push(data.subject);
    }
    if (data.description !== undefined) {
      sets.push(`description = $${i++}`);
      values.push(data.description);
    }
    if (data.assignedTo !== undefined) {
      sets.push(`assigned_to = $${i++}`);
      values.push(data.assignedTo);
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query(
      `UPDATE tickets SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async delete(id) {
    await query("DELETE FROM tickets WHERE id = $1", [id]);
  }
};

module.exports = Ticket;
