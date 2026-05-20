const { query } = require("@socniti/shared");

const TicketMessage = {
  async find(conditions = {}) {
    let where = "1=1";
    const values = [];
    let i = 1;

    if (conditions.ticketId) {
      values.push(conditions.ticketId);
      where += ` AND ticket_id = $${i++}`;
    }

    const res = await query(
      `SELECT * FROM ticket_messages WHERE ${where} ORDER BY created_at ASC`,
      values
    );
    return res.rows.map(_format);
  },

  async create(data) {
    const res = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.ticketId, data.senderId, data.senderName, data.content]
    );
    return _format(res.rows[0]);
  }
};

function _format(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    createdAt: row.created_at
  };
}

module.exports = TicketMessage;
