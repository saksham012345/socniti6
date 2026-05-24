const { query } = require("../db");

function _format(row) {
  return {
    id: row.id,
    _id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    content: row.content,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at
  };
}

const TicketMessage = {
  async find(conditions = {}) {
    const colMap = {
      ticketId: "ticket_id",
      senderId: "sender_id",
      senderRole: "sender_role"
    };
    const keys = Object.keys(conditions);
    if (!keys.length) {
      const res = await query("SELECT * FROM ticket_messages ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${colMap[k] || k}=$${i + 1}`).join(" AND ");
    const res = await query(
      `SELECT * FROM ticket_messages WHERE ${clauses} ORDER BY created_at DESC`,
      keys.map(k => conditions[k])
    );
    return res.rows.map(_format);
  },

  async findById(id) {
    const res = await query("SELECT * FROM ticket_messages WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async findByTicketId(ticketId) {
    const res = await query(
      "SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC",
      [ticketId]
    );
    return res.rows.map(_format);
  },

  async create(data) {
    const res = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, sender_role, content, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.ticketId,
        data.senderId,
        data.senderName,
        data.senderRole || "user",
        data.content,
        data.attachmentUrl || null
      ]
    );
    return _format(res.rows[0]);
  },

  async update(id, data) {
    const sets = [];
    const values = [];
    let i = 1;

    if (data.content) {
      sets.push(`content = $${i++}`);
      values.push(data.content);
    }
    if (data.attachmentUrl) {
      sets.push(`attachment_url = $${i++}`);
      values.push(data.attachmentUrl);
    }

    if (!sets.length) return _format(await this.findById(id));

    values.push(id);
    const res = await query(
      `UPDATE ticket_messages SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async delete(id) {
    await query("DELETE FROM ticket_messages WHERE id = $1", [id]);
  }
};

module.exports = TicketMessage;
