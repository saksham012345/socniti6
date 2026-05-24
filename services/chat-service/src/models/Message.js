const { query } = require("@socniti/shared");

function _format(row) {
  return {
    _id: row.id, id: row.id,
    eventId: row.event_id, senderId: row.sender_id,
    senderName: row.sender_name, content: row.content,
    type: row.type, createdAt: row.created_at,
  };
}

// Chainable find().sort().limit() pattern
function find(conditions = {}) {
  let _sort = { createdAt: 1 };
  let _limit = 50;
  const { eventId } = conditions;

  const chain = {
    sort(s) { _sort = s; return chain; },
    limit(n) { _limit = n; return chain; },
    then(resolve, reject) {
      const order = _sort.createdAt === -1 ? "DESC" : "ASC";
      const p = eventId
        ? query(`SELECT * FROM messages WHERE event_id=$1 ORDER BY created_at ${order} LIMIT $2`, [eventId, _limit])
        : query(`SELECT * FROM messages ORDER BY created_at ${order} LIMIT $1`, [_limit]);
      return p.then(res => resolve(res.rows.map(_format))).catch(reject);
    }
  };
  return chain;
}

async function create(data) {
  const res = await query(
    `INSERT INTO messages (event_id, sender_id, sender_name, content, type)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.eventId, data.senderId, data.senderName, data.content, data.type || "text"]
  );
  return _format(res.rows[0]);
}

module.exports = { find, create };
