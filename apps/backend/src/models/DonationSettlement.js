const { query } = require("../db");

function _format(row) {
  return {
    id: row.id,
    _id: row.id,
    eventId: row.event_id,
    totalAmount: parseFloat(row.total_amount) || 0,
    settledAmount: parseFloat(row.settled_amount) || 0,
    pendingAmount: parseFloat(row.pending_amount) || 0,
    settlementStatus: row.settlement_status,
    lastSettlementDate: row.last_settlement_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const DonationSettlement = {
  async find(conditions = {}) {
    const colMap = {
      eventId: "event_id",
      settlementStatus: "settlement_status"
    };
    const keys = Object.keys(conditions);
    if (!keys.length) {
      const res = await query("SELECT * FROM donation_settlements ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${colMap[k] || k}=$${i + 1}`).join(" AND ");
    const res = await query(
      `SELECT * FROM donation_settlements WHERE ${clauses} ORDER BY created_at DESC`,
      keys.map(k => conditions[k])
    );
    return res.rows.map(_format);
  },

  async findById(id) {
    const res = await query("SELECT * FROM donation_settlements WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async findByEventId(eventId) {
    const res = await query(
      "SELECT * FROM donation_settlements WHERE event_id = $1 LIMIT 1",
      [eventId]
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async create(data) {
    const pendingAmount = (data.totalAmount || 0) - (data.settledAmount || 0);
    const settlementStatus = pendingAmount === 0 ? "settled" : "pending";

    const res = await query(
      `INSERT INTO donation_settlements 
       (event_id, total_amount, settled_amount, pending_amount, settlement_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.eventId,
        data.totalAmount || 0,
        data.settledAmount || 0,
        pendingAmount,
        settlementStatus,
        data.notes || null
      ]
    );
    return _format(res.rows[0]);
  },

  async updateSettlement(eventId, settledAmount, notes) {
    // Get current settlement record
    const current = await this.findByEventId(eventId);
    if (!current) {
      throw new Error("Settlement record not found for this event");
    }

    const newPendingAmount = current.totalAmount - settledAmount;
    const settlementStatus =
      newPendingAmount <= 0
        ? "settled"
        : settledAmount > 0
        ? "partial"
        : "pending";

    const res = await query(
      `UPDATE donation_settlements 
       SET settled_amount = $1, pending_amount = $2, settlement_status = $3, 
           last_settlement_date = NOW(), notes = $4, updated_at = NOW()
       WHERE event_id = $5 RETURNING *`,
      [settledAmount, newPendingAmount, settlementStatus, notes || null, eventId]
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async addDonation(eventId, amount) {
    const current = await this.findByEventId(eventId);

    if (!current) {
      // Create new settlement record
      return this.create({
        eventId,
        totalAmount: amount,
        settledAmount: 0,
        notes: `Initial donation added`
      });
    }

    const newTotalAmount = current.totalAmount + amount;
    const newPendingAmount = newTotalAmount - current.settledAmount;
    const settlementStatus =
      newPendingAmount <= 0
        ? "settled"
        : current.settledAmount > 0
        ? "partial"
        : "pending";

    const res = await query(
      `UPDATE donation_settlements 
       SET total_amount = $1, pending_amount = $2, settlement_status = $3, updated_at = NOW()
       WHERE event_id = $4 RETURNING *`,
      [newTotalAmount, newPendingAmount, settlementStatus, eventId]
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async update(id, data) {
    const sets = [];
    const values = [];
    let i = 1;

    if (data.totalAmount !== undefined) {
      sets.push(`total_amount = $${i++}`);
      values.push(data.totalAmount);
    }
    if (data.settledAmount !== undefined) {
      sets.push(`settled_amount = $${i++}`);
      values.push(data.settledAmount);
    }
    if (data.settlementStatus) {
      sets.push(`settlement_status = $${i++}`);
      values.push(data.settlementStatus);
    }
    if (data.notes) {
      sets.push(`notes = $${i++}`);
      values.push(data.notes);
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query(
      `UPDATE donation_settlements SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0] ? _format(res.rows[0]) : null;
  }
};

module.exports = DonationSettlement;
