const { query } = require("@socniti/shared");

const Event = {
  async findOne(conditions) {
    const { slug, _id, id } = conditions;
    let res;
    if (slug) {
      res = await query("SELECT * FROM events WHERE slug = $1", [slug]);
    } else if (_id || id) {
      res = await query("SELECT * FROM events WHERE id = $1", [_id || id]);
    } else {
      return null;
    }
    if (!res.rows[0]) return null;
    return _format(res.rows[0]);
  },

  async findById(id) {
    const res = await query("SELECT * FROM events WHERE id = $1", [id]);
    return res.rows[0] ? _format(res.rows[0]) : null;
  },

  async find(conditions = {}, sort = { startsAt: 1 }) {
    let where = "1=1";
    const values = [];
    let i = 1;

    if (conditions.$or) {
      const orClauses = conditions.$or.map(c => {
        const key = Object.keys(c)[0];
        const val = c[key];
        if (val.$regex) {
          values.push(`%${val.$regex}%`);
          return `${_col(key)} ILIKE $${i++}`;
        }
        values.push(val);
        return `${_col(key)} = $${i++}`;
      });
      where += ` AND (${orClauses.join(" OR ")})`;
    }

    const simpleKeys = ["category", "city", "status", "organizerId"];
    for (const k of simpleKeys) {
      if (conditions[k] !== undefined) {
        values.push(conditions[k]);
        where += ` AND ${_col(k)} = $${i++}`;
      }
    }

    if (conditions.startsAt) {
      const { $gte, $lt } = conditions.startsAt;
      if ($gte) { values.push($gte); where += ` AND starts_at >= $${i++}`; }
      if ($lt) { values.push($lt); where += ` AND starts_at < $${i++}`; }
    }

    const orderBy = sort.startsAt === 1 ? "starts_at ASC" : "starts_at DESC";
    const res = await query(`SELECT * FROM events WHERE ${where} ORDER BY ${orderBy}`, values);
    return res.rows.map(_format);
  },

  async create(data) {
    const res = await query(
      `INSERT INTO events (
        title, slug, description, category, image_url, organizer_id, organizer_name,
        location_name, address, city, state, lat, lng,
        starts_at, ends_at, max_participants, current_participants, waitlist_count,
        status, donation_needs
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        data.title, data.slug, data.description, data.category,
        data.imageUrl || "", data.organizerId, data.organizerName || "",
        data.locationName, data.address || "", data.city || "", data.state || "",
        data.coordinates?.lat || 0, data.coordinates?.lng || 0,
        data.startsAt, data.endsAt || null,
        data.maxParticipants || 50, 0, 0,
        data.status || "pending",
        JSON.stringify(data.donationNeeds || [])
      ]
    );
    return _format(res.rows[0]);
  },

  async _save(event) {
    await query(
      `UPDATE events SET
        title=$1, description=$2, category=$3, image_url=$4,
        location_name=$5, address=$6, city=$7, state=$8, lat=$9, lng=$10,
        starts_at=$11, ends_at=$12, max_participants=$13,
        current_participants=$14, waitlist_count=$15, status=$16,
        donation_needs=$17, updated_at=NOW()
       WHERE id=$18`,
      [
        event.title, event.description, event.category, event.imageUrl || "",
        event.locationName, event.address || "", event.city || "", event.state || "",
        event.coordinates?.lat || 0, event.coordinates?.lng || 0,
        event.startsAt, event.endsAt || null, event.maxParticipants,
        event.currentParticipants, event.waitlistCount, event.status,
        JSON.stringify(event.donationNeeds || []),
        event.id
      ]
    );
    // Save participants
    await _syncParticipants(event.id, event.participants || [], false);
    await _syncParticipants(event.id, event.waitlist || [], true);
    return event;
  }
};

async function _syncParticipants(eventId, list, isWaitlist) {
  await query("DELETE FROM event_participants WHERE event_id=$1 AND is_waitlist=$2", [eventId, isWaitlist]);
  for (const p of list) {
    await query(
      `INSERT INTO event_participants (event_id, user_id, full_name, email, phone, note, is_waitlist, joined_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (event_id, user_id) DO UPDATE
       SET full_name=EXCLUDED.full_name, email=EXCLUDED.email, phone=EXCLUDED.phone, note=EXCLUDED.note`,
      [eventId, p.userId, p.fullName || "", p.email || "", p.phone || "", p.note || "", isWaitlist, p.joinedAt || new Date()]
    );
  }
}

async function _loadParticipants(eventId) {
  const res = await query(
    "SELECT * FROM event_participants WHERE event_id=$1 ORDER BY joined_at ASC",
    [eventId]
  );
  const participants = [];
  const waitlist = [];
  for (const r of res.rows) {
    const p = { userId: r.user_id, fullName: r.full_name, email: r.email, phone: r.phone || "", note: r.note || "", joinedAt: r.joined_at };
    if (r.is_waitlist) waitlist.push(p); else participants.push(p);
  }
  return { participants, waitlist };
}

function _format(row) {
  const event = {
    id: row.id,
    _id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    locationName: row.location_name,
    address: row.address,
    city: row.city,
    state: row.state,
    coordinates: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) },
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxParticipants: row.max_participants,
    currentParticipants: row.current_participants,
    waitlistCount: row.waitlist_count,
    status: row.status,
    donationNeeds: typeof row.donation_needs === "string"
      ? JSON.parse(row.donation_needs)
      : (row.donation_needs || []),
    averageRating: row.average_rating || 0,
    totalReviews: row.total_reviews || 0,
    participants: [],
    waitlist: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Lazy-load participants on first access
  let participantsLoaded = false;
  const loadParts = async () => {
    if (!participantsLoaded) {
      const { participants, waitlist } = await _loadParticipants(event.id);
      event.participants = participants;
      event.waitlist = waitlist;
      participantsLoaded = true;
    }
  };

  event.loadParticipants = loadParts;

  event.save = async () => {
    await Event._save(event);
    return event;
  };

  event.deleteOne = async () => {
    await query("DELETE FROM events WHERE id=$1", [event.id]);
  };

  return event;
}

function _col(key) {
  const map = {
    title: "title", slug: "slug", description: "description",
    category: "category", city: "city", state: "state",
    status: "status", organizerId: "organizer_id"
  };
  return map[key] || key;
}

module.exports = Event;
