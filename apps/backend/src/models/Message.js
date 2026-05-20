const { query } = require("../db");

function _format(row) {
  return { id: row.id, _id: row.id, eventId: row.event_id, senderId: row.sender_id, senderName: row.sender_name, content: row.content, type: row.type, createdAt: row.created_at };
}

const Message = {
  async find(conditions = {}, opts = {}) {
    const { eventId } = conditions;
    const limit = opts.limit || 50;
    const order = opts.sort?.createdAt === -1 ? "DESC" : "ASC";
    if (eventId) {
      const res = await query(`SELECT * FROM messages WHERE event_id=$1 ORDER BY created_at ${order} LIMIT $2`, [eventId, limit]);
      return res.rows.map(_format);
    }
    const res = await query(`SELECT * FROM messages ORDER BY created_at ${order} LIMIT $1`, [limit]);
    return res.rows.map(_format);
  },
  async create(data) {
    const res = await query(
      `INSERT INTO messages (event_id,sender_id,sender_name,content,type) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.eventId, data.senderId, data.senderName, data.content, data.type||"text"]
    );
    return _format(res.rows[0]);
  }
};

module.exports = Message;
