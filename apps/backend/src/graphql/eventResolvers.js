const Event = require("../models/Event");
const { toSlug, EVENT_CATEGORIES } = require("@socniti/shared");
const { distanceInKm } = require("../utils/geo");

const serializeEvent = async (event, viewerCoordinates) => {
  if (event.loadParticipants) await event.loadParticipants();

  const toIso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

  const base = {
    id: event.id || event._id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl || null,
    organizerId: event.organizerId,
    organizerName: event.organizerName || null,
    locationName: event.locationName,
    address: event.address || null,
    city: event.city || null,
    state: event.state || null,
    coordinates: event.coordinates,
    startsAt: toIso(event.startsAt),
    endsAt: event.endsAt ? toIso(event.endsAt) : null,
    maxParticipants: event.maxParticipants,
    currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount,
    status: event.status,
    donationNeeds: event.donationNeeds || [],
    paymentQr: event.paymentQr || null,
    organizerVerified: !!event.organizerVerified,
    participants: (event.participants || []).map(p => ({
      userId: p.userId,
      fullName: p.fullName || null,
      email: p.email || null,
      joinedAt: toIso(p.joinedAt)
    })),
    waitlist: (event.waitlist || []).map(p => ({
      userId: p.userId,
      fullName: p.fullName || null,
      email: p.email || null,
      joinedAt: toIso(p.joinedAt)
    })),
    averageRating: event.averageRating || 0,
    totalReviews: event.totalReviews || 0,
    createdAt: toIso(event.createdAt),
    distanceKm: null
  };

  if (viewerCoordinates?.lat && viewerCoordinates?.lng) {
    base.distanceKm = distanceInKm(
      viewerCoordinates.lat, viewerCoordinates.lng,
      event.coordinates.lat, event.coordinates.lng
    );
  }
  return base;
};

const resolvers = {
  Query: {
    events: async (_, args) => {
      const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId } = args;
      const conditions = {};
      if (search) conditions.$or = [
        { title: { $regex: search } },
        { description: { $regex: search } }
      ];
      if (category) conditions.category = category;
      if (city) conditions.city = city;
      if (status) conditions.status = status;
      if (organizerId) conditions.organizerId = organizerId;
      if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        conditions.startsAt = { $gte: start, $lt: end };
      }

      const events = await Event.find(conditions, { startsAt: 1 });
      const vc = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
      let data = await Promise.all(events.map(e => serializeEvent(e, vc)));

      if (vc && maxDistanceKm) {
        data = data.filter(e => e.distanceKm != null && e.distanceKm <= Number(maxDistanceKm));
      }
      if (vc) data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      return { events: data, filters: { categories: EVENT_CATEGORIES } };
    },

    event: async (_, { slug }) => {
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      return serializeEvent(event);
    },

    organizerDashboard: async (_, __, context) => {
      if (!context.user) throw new Error("Authentication required");
      const events = await Event.find({ organizerId: context.user.sub }, { startsAt: 1 });
      const analytics = events.reduce(
        (acc, e) => { acc.totalEvents++; acc.totalParticipants += e.currentParticipants; acc.totalWaitlist += e.waitlistCount; return acc; },
        { totalEvents: 0, totalParticipants: 0, totalWaitlist: 0 }
      );
      return { analytics, events: await Promise.all(events.map(e => serializeEvent(e))) };
    }
  },

  Mutation: {
    createEvent: async (_, { input }, context) => {
      if (!context.user) throw new Error("Authentication required");
      const slug = `${toSlug(input.title)}-${Date.now().toString().slice(-6)}`;
      const event = await Event.create({
        title: input.title, slug, description: input.description,
        category: input.category, imageUrl: input.imageUrl || "",
        organizerId: context.user.sub, organizerName: input.organizerName || "",
        locationName: input.locationName, address: input.address || "",
        city: input.city || "", state: input.state || "",
        coordinates: input.coordinates,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        maxParticipants: input.maxParticipants || 50,
        status: "upcoming", donationNeeds: input.donationNeeds || [], paymentQr: input.paymentQr || null
      });
      return { success: true, message: "Event created successfully", event: await serializeEvent(event) };
    },

    updateEvent: async (_, { slug, input }, context) => {
      if (!context.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      if (event.organizerId !== context.user.sub && context.user.role !== "admin") throw new Error("Only the organizer or admin can update this event");
      if (input.title) event.title = input.title;
      if (input.description) event.description = input.description;
      if (input.category) event.category = input.category;
      if (input.imageUrl !== undefined) event.imageUrl = input.imageUrl;
      if (input.locationName) event.locationName = input.locationName;
      if (input.address !== undefined) event.address = input.address;
      if (input.city !== undefined) event.city = input.city;
      if (input.state !== undefined) event.state = input.state;
      if (input.coordinates) event.coordinates = input.coordinates;
      if (input.startsAt) event.startsAt = new Date(input.startsAt);
      if (input.endsAt !== undefined) event.endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (input.maxParticipants) event.maxParticipants = input.maxParticipants;
      if (input.status) event.status = input.status;
      if (input.donationNeeds) event.donationNeeds = input.donationNeeds;
      if (input.paymentQr !== undefined) event.paymentQr = input.paymentQr;
      await event.save();
      return { success: true, message: "Event updated successfully", event: await serializeEvent(event) };
    },

    deleteEvent: async (_, { slug }, context) => {
      if (!context.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      if (event.organizerId !== context.user.sub && context.user.role !== "admin") throw new Error("Only the organizer or admin can delete this event");
      await event.deleteOne();
      return { success: true, message: "Event deleted successfully", event: null };
    },

    verifyOrganizerForEvent: async (_, { slug }, context) => {
      if (!context.user) throw new Error("Authentication required");
      if (context.user.role !== "admin") throw new Error("Insufficient permissions");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      event.organizerVerified = true;
      await event.save();
      return { success: true, message: "Organizer verified for event", event: await serializeEvent(event) };
    },

    registerForEvent: async (_, { slug, input }, context) => {
      if (!context.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      await event.loadParticipants();
      const alreadyJoined = event.participants.some(p => p.userId === context.user.sub);
      if (alreadyJoined) throw new Error("You are already registered for this event");
      const attendee = { userId: context.user.sub, fullName: input?.fullName || "", email: input?.email || "" };
      let message;
      if (event.currentParticipants < event.maxParticipants) {
        event.participants.push(attendee);
        event.currentParticipants += 1;
        message = "Registration successful";
      } else {
        event.waitlist.push(attendee);
        event.waitlistCount += 1;
        message = "Added to waitlist";
      }
      await event.save();
      return { success: true, message, event: await serializeEvent(event) };
    },

    cancelRegistration: async (_, { slug }, context) => {
      if (!context.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      await event.loadParticipants();
      const pi = event.participants.findIndex(p => p.userId === context.user.sub);
      if (pi >= 0) {
        event.participants.splice(pi, 1);
        event.currentParticipants = Math.max(0, event.currentParticipants - 1);
        if (event.waitlist.length > 0) {
          event.participants.push(event.waitlist.shift());
          event.currentParticipants += 1;
          event.waitlistCount = Math.max(0, event.waitlistCount - 1);
        }
      } else {
        const wi = event.waitlist.findIndex(p => p.userId === context.user.sub);
        if (wi < 0) throw new Error("Registration not found");
        event.waitlist.splice(wi, 1);
        event.waitlistCount = Math.max(0, event.waitlistCount - 1);
      }
      await event.save();
      return { success: true, message: "Registration cancelled successfully", event: await serializeEvent(event) };
    }
  },

  Event: {
    organizer: (event) => ({ __typename: "User", id: event.organizerId })
  },
  Participant: {
    user: (participant) => ({ __typename: "User", id: participant.userId })
  }
};

module.exports = resolvers;
