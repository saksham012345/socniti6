const { query } = require("@socniti/shared");

const Message = {
  async find(conditions = {}) {
    let where = "1=1";
    const values = [];
    let i = 1;

    if (conditions.eventId) {
      values.push(conditions.eventId);
      where += ` AND event_id = $${i++}`;
    }

    const res = await query(
      `SELECT * FROM messages WHERE ${where} ORDER BY created_at DESC`,
      values
    );

    return res.rows.map(_format);
  },

  async create(data) {
    const res = await query(
      `INSERT INTO messages (event_id, sender_id, sender_name, content, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.eventId, data.senderId, data.senderName, data.content, data.type || "text"]
    );
    return _format(res.rows[0]);
  }
};

function _format(row) {
  return {
    id: row.id,
    _id: row.id, // For backward compatibility with existing code
    eventId: row.event_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    type: row.type,
    createdAt: row.created_at
  };
}

// Add chainable methods to mock Mongoose behavior
Message.find = function(conditions) {
  const promise = Message._findOriginal(conditions);
  promise.sort = function() { return this; }; // Dummy sort
  promise.limit = async function(limitVal) {
    const res = await this;
    return res.slice(0, limitVal);
  };
  return promise;
};
Message._findOriginal = async function(conditions) {
  let where = "1=1";
  const values = [];
  let i = 1;

  if (conditions.eventId) {
    values.push(conditions.eventId);
    where += ` AND event_id = $${i++}`;
  }

  const res = await query(
    `SELECT * FROM messages WHERE ${where} ORDER BY created_at DESC`,
    values
  );

  return res.rows.map(_format);
};

module.exports = Message;
