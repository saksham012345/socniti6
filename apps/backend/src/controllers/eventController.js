const Event = require("../models/Event");
const EventVerification = require("../models/EventVerification");

const EVENT_CATEGORIES = ["Education","Health","Environment","Food Drive","Fundraiser","Animal Welfare","Community Cleanup","Skill Building","Healthcare"];
const toSlug = (v = "") => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
const toIso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

const serializeEvent = async (event, vc) => {
  if (event.loadParticipants) await event.loadParticipants();
  const base = {
    id: event.id, title: event.title, slug: event.slug, description: event.description,
    category: event.category, imageUrl: event.imageUrl, organizerId: event.organizerId,
    organizerName: event.organizerName, locationName: event.locationName, address: event.address,
    city: event.city, state: event.state, coordinates: event.coordinates,
    startsAt: toIso(event.startsAt), endsAt: event.endsAt ? toIso(event.endsAt) : null,
    maxParticipants: event.maxParticipants, currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount, status: event.status,
    donationNeeds: event.donationNeeds || [],
    paymentQr: event.paymentQr || null,
    organizerVerified: !!event.organizerVerified,
    participants: (event.participants||[]).map(p => ({ userId: p.userId, fullName: p.fullName, email: p.email, phone: p.phone||"", note: p.note||"", joinedAt: toIso(p.joinedAt) })),
    waitlist: (event.waitlist||[]).map(p => ({ userId: p.userId, fullName: p.fullName, email: p.email, joinedAt: toIso(p.joinedAt) })),
    averageRating: event.averageRating||0, totalReviews: event.totalReviews||0,
    createdAt: toIso(event.createdAt), distanceKm: null
  };
  if (vc?.lat && vc?.lng) base.distanceKm = Event.distanceInKm(vc.lat, vc.lng, event.coordinates.lat, event.coordinates.lng);
  return base;
};

exports.listEvents = async (req, res) => {
  try {
    const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId, includePast } = req.query;
    const cond = {};
    if (search) {
      cond.$or = [
        { title: { $regex: search } },
        { description: { $regex: search } },
        { city: { $regex: search } },
        { locationName: { $regex: search } },
        { state: { $regex: search } }
      ];
    }
    if (category) cond.category = category;
    if (city) cond.city = city;
    if (status) cond.status = status;
    if (!status) cond.status = "upcoming";
    if (organizerId) cond.organizerId = organizerId;
    if (!includePast && !date) cond.startsAt = { $gte: new Date() };
    if (date) { const s = new Date(date), e = new Date(date); e.setDate(e.getDate()+1); cond.startsAt = { $gte: s, $lt: e }; }
    const events = await Event.find(cond, { startsAt: 1 });
    const vc = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
    let data = await Promise.all(events.map(e => serializeEvent(e, vc)));
    if (vc && maxDistanceKm) data = data.filter(e => e.distanceKm <= Number(maxDistanceKm));
    if (vc) data.sort((a, b) => (a.distanceKm||0) - (b.distanceKm||0));
    res.json({ events: data, filters: { categories: EVENT_CATEGORIES } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getEventBySlug = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ event: await serializeEvent(event) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createEvent = async (req, res) => {
  try {
    const slug = `${toSlug(req.body.title)}-${Date.now().toString().slice(-6)}`;
    const event = await Event.create({
      title: req.body.title, slug, description: req.body.description,
      category: req.body.category, imageUrl: req.body.imageUrl||"",
      organizerId: req.user.sub||req.user.id, organizerName: req.body.organizerName||"",
      locationName: req.body.locationName, address: req.body.address||"",
      city: req.body.city||"", state: req.body.state||"",
      coordinates: req.body.coordinates||{ lat:0, lng:0 },
      startsAt: req.body.startsAt, endsAt: req.body.endsAt||null,
      maxParticipants: req.body.maxParticipants||50,
      status: req.user.role === "admin" ? (req.body.status || "upcoming") : "pending",
      donationNeeds: req.body.donationNeeds||[],
      paymentQr: req.body.paymentQr || null,
      organizerVerified: req.user.role === "admin" ? true : false
    });
    if (event.status === "pending") await EventVerification.create({ eventId: event.id });
    // Emit real-time event to connected clients
    try {
      const io = req.app.get("io");
      if (io) io.emit("event-created", await serializeEvent(event));
    } catch (e) { console.warn("Socket emit error (createEvent):", e.message); }

    res.status(201).json({ message: "Event created", event: await serializeEvent(event) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.organizerId !== (req.user.sub||req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Only the organizer or admin can update" });
    // allow admin to update donation needs and payment QR
    if (req.body.donationNeeds !== undefined) event.donationNeeds = req.body.donationNeeds;
    if (req.body.paymentQr !== undefined) event.paymentQr = req.body.paymentQr;
    Object.assign(event, req.body);
    await event.save();
    try { const io = req.app.get("io"); if (io) io.emit("event-updated", await serializeEvent(event)); } catch (e) { console.warn("Socket emit error (updateEvent):", e.message); }
    res.json({ message: "Event updated", event: await serializeEvent(event) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.organizerId !== (req.user.sub||req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Only the organizer or admin can delete" });
    await event.deleteOne();
    try { const io = req.app.get("io"); if (io) io.emit("event-deleted", { id: event.id, slug: event.slug }); } catch (e) { console.warn("Socket emit error (deleteEvent):", e.message); }
    res.json({ message: "Event deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await event.loadParticipants();
    const userId = req.user.sub||req.user.id;
    if (event.participants.some(p => p.userId === userId) || event.waitlist.some(p => p.userId === userId))
      return res.status(409).json({ message: "Already registered" });
    const attendee = { userId, fullName: req.body.fullName||req.user.username||"", email: req.body.email||req.user.email||"", phone: req.body.phone||"", note: req.body.note||"" };
    let message;
    if (event.currentParticipants < event.maxParticipants) {
      event.participants.push(attendee); event.currentParticipants++; message = "Registration successful";
    } else {
      event.waitlist.push(attendee); event.waitlistCount++; message = "Added to waitlist";
    }
    await event.save();
    try { const io = req.app.get("io"); if (io) io.emit("event-updated", await serializeEvent(event)); } catch (e) { console.warn("Socket emit error (registerForEvent):", e.message); }
    res.json({ message, event: await serializeEvent(event) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.cancelRegistration = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await event.loadParticipants();
    const userId = req.user.sub||req.user.id;
    const pi = event.participants.findIndex(p => p.userId === userId);
    if (pi >= 0) {
      event.participants.splice(pi, 1); event.currentParticipants = Math.max(0, event.currentParticipants-1);
      if (event.waitlist.length > 0) { event.participants.push(event.waitlist.shift()); event.currentParticipants++; event.waitlistCount = Math.max(0, event.waitlistCount-1); }
    } else {
      const wi = event.waitlist.findIndex(p => p.userId === userId);
      if (wi < 0) return res.status(404).json({ message: "Registration not found" });
      event.waitlist.splice(wi, 1); event.waitlistCount = Math.max(0, event.waitlistCount-1);
    }
    await event.save();
    try { const io = req.app.get("io"); if (io) io.emit("event-updated", await serializeEvent(event)); } catch (e) { console.warn("Socket emit error (cancelRegistration):", e.message); }
    res.json({ message: "Registration cancelled", event: await serializeEvent(event) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getParticipants = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.organizerId !== (req.user.sub||req.user.id)) return res.status(403).json({ message: "Only organizer can view" });
    await event.loadParticipants();
    res.json({ participants: event.participants, waitlist: event.waitlist, stats: { total: event.currentParticipants, waitlist: event.waitlistCount, capacity: event.maxParticipants, spotsLeft: Math.max(0, event.maxParticipants - event.currentParticipants) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getOrganizerDashboard = async (req, res) => {
  try {
    const userId = req.user.sub||req.user.id;
    const events = await Event.find({ organizerId: userId }, { startsAt: 1 });
    const analytics = events.reduce((acc, e) => { acc.totalEvents++; acc.totalParticipants += e.currentParticipants; acc.totalWaitlist += e.waitlistCount; return acc; }, { totalEvents:0, totalParticipants:0, totalWaitlist:0 });
    res.json({ analytics, events: await Promise.all(events.map(e => serializeEvent(e))) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
