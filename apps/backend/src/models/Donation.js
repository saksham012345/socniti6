const { query } = require("../db");

function _format(row) {
  return { id: row.id, _id: row.id, eventId: row.event_id, donorId: row.donor_id, donorName: row.donor_name, amount: parseFloat(row.amount)||0, item: row.item, quantity: row.quantity, type: row.type, status: row.status, message: row.message, createdAt: row.created_at };
}

const Donation = {
  async find(conditions = {}) {
    const colMap = { eventId:"event_id", donorId:"donor_id", status:"status", type:"type" };
    const keys = Object.keys(conditions);
    if (!keys.length) {
      const res = await query("SELECT * FROM donations ORDER BY created_at DESC");
      return res.rows.map(_format);
    }
    const clauses = keys.map((k, i) => `${colMap[k]||k}=$${i+1}`).join(" AND ");
    const res = await query(`SELECT * FROM donations WHERE ${clauses} ORDER BY created_at DESC`, keys.map(k => conditions[k]));
    return res.rows.map(_format);
  },
  async create(data) {
    const res = await query(
      `INSERT INTO donations (event_id,donor_id,donor_name,amount,item,quantity,type,status,message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [data.eventId, data.donorId, data.donorName, data.amount||0, data.item||null, data.quantity||null, data.type, data.status||"completed", data.message||null]
    );
    return _format(res.rows[0]);
  }
};

module.exports = Donation;
