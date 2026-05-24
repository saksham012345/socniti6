const { query } = require("../db");

function _format(row) {
  return {
    id: row.id,
    _id: row.id,
    eventId: row.event_id,
    status: row.status,
    verifiedBy: row.verified_by,
    verificationNotes: row.verification_notes,
    rejectionReason: row.rejection_reason,
    verifiedAt: row.verified_at,
    createdAt: row.created_at
  };
}

const EventVerification = {
  async find(conditions = {}) {
    const colMap = {
      eventId: "event_id",
      status: "status",
      verifiedBy: "verified_by"
    };
    const keys = Object.keys(conditions);
    if (!keys.length) {
      const res = await query("SELECT * FROM event_verification ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${colMap[k] || k}=$${i + 1}`).join(" AND ");
    const res = await query(
      `SELECT * FROM event_verification WHERE ${clauses} ORDER BY created_at DESC`,
      keys.map(k => conditions[k])
    );
    return res.rows.map(_format);
  },

  async findById(id) {
    const res = await query("SELECT * FROM event_verification WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async findByEventId(eventId) {
    const res = await query(
      "SELECT * FROM event_verification WHERE event_id = $1 LIMIT 1",
      [eventId]
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async create(data) {
    const res = await query(
      `INSERT INTO event_verification (event_id, status, verified_by, verification_notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.eventId, data.status || "pending", data.verifiedBy || null, data.verificationNotes || null]
    );
    return _format(res.rows[0]);
  },

  async approve(eventId, verifiedBy, notes) {
    const res = await query(
      `UPDATE event_verification 
       SET status = 'approved', verified_by = $1, verification_notes = $2, verified_at = NOW()
       WHERE event_id = $3 RETURNING *`,
      [verifiedBy, notes || null, eventId]
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async reject(eventId, verifiedBy, reason) {
    const res = await query(
      `UPDATE event_verification 
       SET status = 'rejected', verified_by = $1, rejection_reason = $2, verified_at = NOW()
       WHERE event_id = $3 RETURNING *`,
      [verifiedBy, reason || null, eventId]
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async update(id, data) {
    const sets = [];
    const values = [];
    let i = 1;

    if (data.status) {
      sets.push(`status = $${i++}`);
      values.push(data.status);
    }
    if (data.verificationNotes) {
      sets.push(`verification_notes = $${i++}`);
      values.push(data.verificationNotes);
    }
    if (data.rejectionReason) {
      sets.push(`rejection_reason = $${i++}`);
      values.push(data.rejectionReason);
    }

    if (!sets.length) return _format(await this.findById(id));

    values.push(id);
    const res = await query(
      `UPDATE event_verification SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  }
};

module.exports = EventVerification;
