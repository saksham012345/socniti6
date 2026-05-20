const Event = require("../models/Event");
const { toSlug, EVENT_CATEGORIES } = require("@socniti/shared");
const { distanceInKm } = require("../utils/geo");

const toIso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

const serializeEvent = async (event, viewerCoordinates) => {
  if (event.loadParticipants) await event.loadParticipants();
  const base = {
    id: event.id || event._id,
    title: event.title, slug: event.slug, description: event.description,
    category: event.category, imageUrl: event.imageUrl,
    organizerId: event.organizerId, organizerName: event.organizerName,
    locationName: event.locationName, address: event.address,
    city: event.city, state: event.state, coordinates: event.coordinates,
    startsAt: toIso(event.startsAt), endsAt: event.endsAt ? toIso(event.endsAt) : null,
    maxParticipants: event.maxParticipants, currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount, status: event.status,
    donationNeeds: event.donationNeeds || [],
    participants: (event.participants || []).map(p => ({
      userId: p.userId, fullName: p.fullName, email: p.email, joinedAt: toIso(p.joinedAt)
    })),
    averageRating: event.averageRating, totalReviews: event.totalReviews,
    createdAt: toIso(event.createdAt)
  };
  if (viewerCoordinates?.lat && viewerCoordinates?.lng) {
    base.distanceKm = distanceInKm(viewerCoordinates.lat, viewerCoordinates.lng, event.coordinates.lat, event.coordinates.lng);
  }
  return base;
};

const listEvents = async (req, res) => {
  const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId, includePast } = req.query;
  const conditions = {};
  if (search) conditions.$or = [{ title: { $regex: search } }, { description: { $regex: search } }];
  if (category) conditions.category = category;
  if (city) conditions.city = city;
  if (status) conditions.status = status;
  if (organizerId) conditions.organizerId = organizerId;
  // By default only show upcoming/ongoing events (not past)
  if (!includePast) {
    conditions.startsAt = { $gte: new Date() };
  }
  if (date) {
    const start = new Date(date); const end = new Date(date); end.setDate(end.getDate() + 1);
    conditions.startsAt = { $gte: start, $lt: end };
  }
  const events = await Event.find(conditions, { startsAt: 1 });
  const vc = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  let data = await Promise.all(events.map(e => serializeEvent(e, vc)));
  if (vc && maxDistanceKm) data = data.filter(e => e.distanceKm <= Number(maxDistanceKm));
  if (vc) data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  return res.json({ events: data, filters: { categories: EVENT_CATEGORIES } });
};

const getEventBySlug = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  return res.json({ event: await serializeEvent(event) });
};

const createEvent = async (req, res) => {
  const slug = `${toSlug(req.body.title)}-${Date.now().toString().slice(-6)}`;
  const event = await Event.create({
    title: req.body.title, slug, description: req.body.description,
    category: req.body.category, imageUrl: req.body.imageUrl || "",
    organizerId: req.user.sub || req.user.id, organizerName: req.body.organizerName || "",
    locationName: req.body.locationName, address: req.body.address || "",
    city: req.body.city || "", state: req.body.state || "",
    coordinates: req.body.coordinates || { lat: 0, lng: 0 },
    startsAt: req.body.startsAt, endsAt: req.body.endsAt || null,
    maxParticipants: req.body.maxParticipants || 50,
    status: req.body.status || "upcoming", donationNeeds: req.body.donationNeeds || []
  });
  return res.status(201).json({ message: "Event created", event: await serializeEvent(event) });
};

const updateEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.organizerId !== (req.user.sub || req.user.id)) return res.status(403).json({ message: "Only the organizer can update this event" });
  Object.assign(event, req.body);
  await event.save();
  return res.json({ message: "Event updated", event: await serializeEvent(event) });
};

const deleteEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.organizerId !== (req.user.sub || req.user.id)) return res.status(403).json({ message: "Only the organizer can delete this event" });
  await event.deleteOne();
  return res.json({ message: "Event deleted" });
};

const registerForEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  await event.loadParticipants();
  const userId = req.user.sub || req.user.id;
  const alreadyJoined = event.participants.some(p => p.userId === userId) ||
    event.waitlist.some(p => p.userId === userId);
  if (alreadyJoined) return res.status(409).json({ message: "You are already registered for this event" });
  const attendee = {
    userId,
    fullName: req.body.fullName || req.user.username || "",
    email: req.body.email || req.user.email || "",
    phone: req.body.phone || "",
    note: req.body.note || ""
  };
  let message;
  if (event.currentParticipants < event.maxParticipants) {
    event.participants.push(attendee); event.currentParticipants += 1; message = "Registration successful";
  } else {
    event.waitlist.push(attendee); event.waitlistCount += 1; message = "Added to waitlist";
  }
  await event.save();
  return res.json({ message, event: await serializeEvent(event) });
};

const getParticipants = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  const userId = req.user.sub || req.user.id;
  if (event.organizerId !== userId) return res.status(403).json({ message: "Only the organizer can view participants" });
  await event.loadParticipants();
  return res.json({
    participants: event.participants,
    waitlist: event.waitlist,
    stats: {
      total: event.currentParticipants,
      waitlist: event.waitlistCount,
      capacity: event.maxParticipants,
      spotsLeft: Math.max(0, event.maxParticipants - event.currentParticipants)
    }
  });
};

const cancelRegistration = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  await event.loadParticipants();
  const userId = req.user.sub || req.user.id;
  const pi = event.participants.findIndex(p => p.userId === userId);
  if (pi >= 0) {
    event.participants.splice(pi, 1); event.currentParticipants = Math.max(0, event.currentParticipants - 1);
    if (event.waitlist.length > 0) { event.participants.push(event.waitlist.shift()); event.currentParticipants += 1; event.waitlistCount = Math.max(0, event.waitlistCount - 1); }
  } else {
    const wi = event.waitlist.findIndex(p => p.userId === userId);
    if (wi < 0) return res.status(404).json({ message: "Registration not found" });
    event.waitlist.splice(wi, 1); event.waitlistCount = Math.max(0, event.waitlistCount - 1);
  }
  await event.save();
  return res.json({ message: "Registration cancelled", event: await serializeEvent(event) });
};

const getOrganizerDashboard = async (req, res) => {
  const userId = req.user.sub || req.user.id;
  const events = await Event.find({ organizerId: userId }, { startsAt: 1 });
  const analytics = events.reduce(
    (acc, e) => { acc.totalEvents++; acc.totalParticipants += e.currentParticipants; acc.totalWaitlist += e.waitlistCount; return acc; },
    { totalEvents: 0, totalParticipants: 0, totalWaitlist: 0 }
  );
  return res.json({ analytics, events: await Promise.all(events.map(e => serializeEvent(e))) });
};

const getPendingEvents = async (req, res) => {
  const events = await Event.find({ status: "pending" }, { startsAt: 1 });
  return res.json({ events: await Promise.all(events.map(e => serializeEvent(e))) });
};

const approveEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  event.status = "upcoming";
  await event.save();
  return res.json({ message: "Event approved", event: await serializeEvent(event) });
};

const rejectEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return res.status(404).json({ message: "Event not found" });
  event.status = "cancelled";
  await event.save();
  return res.json({ message: "Event rejected", event: await serializeEvent(event) });
};

module.exports = { listEvents, getEventBySlug, createEvent, updateEvent, deleteEvent, registerForEvent, cancelRegistration, getOrganizerDashboard, getParticipants, getPendingEvents, approveEvent, rejectEvent };
