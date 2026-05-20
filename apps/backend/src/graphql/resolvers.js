const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Event = require("../models/Event");
const Donation = require("../models/Donation");
const Message = require("../models/Message");

const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const EVENT_CATEGORIES = ["Education","Health","Environment","Food Drive","Fundraiser","Animal Welfare","Community Cleanup","Skill Building","Healthcare"];

const toSlug = (v = "") => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
const toIso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);

const generateToken = (user) => jwt.sign({ sub: user.id, id: user.id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

const sendOtpEmail = async (email, otp, fullName) => {
  // Always log OTP to server console (visible in Render logs)
  console.log(`\n📧 OTP for ${email}: ${otp}\n`);
  try {
    if (!process.env.SMTP_HOST) return true;
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT||587, secure: process.env.SMTP_PORT==465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await t.sendMail({ from: process.env.SMTP_FROM||"SOCNITI <noreply@socniti.com>", to: email, subject: "Verify your SOCNITI Account", html: `<div style="font-family:Arial;max-width:600px;margin:0 auto"><h2 style="color:#112A22">Welcome to SOCNITI!</h2><p>Hello ${fullName},</p><p>Your verification code is:</p><div style="background:#f3f4f6;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:5px;color:#4A7C59">${otp}</div><p style="color:#6b7280;font-size:14px">Expires in 10 minutes.</p></div>` });
    return true;
  } catch (err) {
    console.error("Email error:", err.message);
    console.log(`📧 OTP for ${email}: ${otp}`);
    return false;
  }
};

const serializeEvent = async (event, vc) => {
  if (event.loadParticipants) await event.loadParticipants();
  return {
    id: event.id, title: event.title, slug: event.slug, description: event.description,
    category: event.category, imageUrl: event.imageUrl, organizerId: event.organizerId,
    organizerName: event.organizerName, locationName: event.locationName, address: event.address,
    city: event.city, state: event.state, coordinates: event.coordinates,
    startsAt: toIso(event.startsAt), endsAt: event.endsAt ? toIso(event.endsAt) : null,
    maxParticipants: event.maxParticipants, currentParticipants: event.currentParticipants,
    waitlistCount: event.waitlistCount, status: event.status,
    donationNeeds: event.donationNeeds||[],
    participants: (event.participants||[]).map(p => ({ userId: p.userId, fullName: p.fullName, email: p.email, phone: p.phone||"", note: p.note||"", joinedAt: toIso(p.joinedAt) })),
    waitlist: (event.waitlist||[]).map(p => ({ userId: p.userId, fullName: p.fullName, email: p.email, joinedAt: toIso(p.joinedAt) })),
    averageRating: event.averageRating||0, totalReviews: event.totalReviews||0,
    createdAt: toIso(event.createdAt),
    distanceKm: vc?.lat && vc?.lng ? Event.distanceInKm(vc.lat, vc.lng, event.coordinates.lat, event.coordinates.lng) : null
  };
};

const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      return User.findById(ctx.user.id || ctx.user.sub);
    },
    user: async (_, { id }) => User.findById(id),
    users: async () => User.find({}),

    events: async (_, args) => {
      const { search, category, city, status, date, lat, lng, maxDistanceKm, organizerId } = args;
      const cond = {};
      if (search) cond.$or = [{ title: { $regex: search } }, { description: { $regex: search } }];
      if (category) cond.category = category;
      if (city) cond.city = city;
      if (status) cond.status = status;
      if (organizerId) cond.organizerId = organizerId;
      if (!date) cond.startsAt = { $gte: new Date() };
      if (date) { const s = new Date(date), e = new Date(date); e.setDate(e.getDate()+1); cond.startsAt = { $gte: s, $lt: e }; }
      const events = await Event.find(cond, { startsAt: 1 });
      const vc = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
      let data = await Promise.all(events.map(e => serializeEvent(e, vc)));
      if (vc && maxDistanceKm) data = data.filter(e => e.distanceKm <= Number(maxDistanceKm));
      if (vc) data.sort((a, b) => (a.distanceKm||0) - (b.distanceKm||0));
      return { events: data, filters: { categories: EVENT_CATEGORIES } };
    },

    event: async (_, { slug }) => {
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      return serializeEvent(event);
    },

    organizerDashboard: async (_, __, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const events = await Event.find({ organizerId: ctx.user.sub||ctx.user.id }, { startsAt: 1 });
      const analytics = events.reduce((acc, e) => { acc.totalEvents++; acc.totalParticipants += e.currentParticipants; acc.totalWaitlist += e.waitlistCount; return acc; }, { totalEvents:0, totalParticipants:0, totalWaitlist:0 });
      return { analytics, events: await Promise.all(events.map(e => serializeEvent(e))) };
    },

    eventDonations: async (_, { eventId }) => {
      const donations = await Donation.find({ eventId });
      const stats = {
        totalMonetary: donations.filter(d => d.type==="monetary"&&d.status==="completed").reduce((s,d)=>s+d.amount,0),
        totalItems: donations.filter(d => d.type==="item"&&d.status==="completed").length,
        totalDonations: donations.filter(d => d.status==="completed").length,
      };
      return { donations: donations.map(d => ({ ...d, createdAt: toIso(d.createdAt) })), stats };
    },

    myDonations: async (_, __, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const donations = await Donation.find({ donorId: ctx.user.sub||ctx.user.id });
      return donations.map(d => ({ ...d, createdAt: toIso(d.createdAt) }));
    },

    eventMessages: async (_, { eventId, limit = 50 }) => {
      const messages = await Message.find({ eventId }, { limit, sort: { createdAt: 1 } });
      return messages.map(m => ({ ...m, createdAt: toIso(m.createdAt) }));
    },
  },

  Mutation: {
    signup: async (_, { fullName, username, email, password, role }) => {
      if (!fullName||!username||!email||!password) throw new Error("All fields required");
      if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) throw new Error("Invalid username");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      const ne = email.toLowerCase().trim(), nu = username.toLowerCase().trim();
      const existing = await User.findOne({ email: ne });
      if (existing?.verified) throw new Error("Email already registered");
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      if (existing) {
        existing.fullName = fullName; existing.username = nu; existing.password = hashedPassword;
        existing.role = role||"user"; existing.otp = otp; existing.otpExpires = otpExpires; existing.verified = false;
        await existing.save();
      } else {
        await User.create({ fullName, username: nu, email: ne, password: hashedPassword, role: role||"user", otp, otpExpires, verified: false });
      }
      // Fire email async — don't block the response on email delivery
      sendOtpEmail(ne, otp, fullName).catch(err => console.error("Email send error:", err.message));
      return { success: true, message: `OTP sent to ${ne}. Check your email or server logs.` };
    },

    verifySignupOtp: async (_, { email, otp }) => {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) throw new Error("User not found");
      if (user.verified) return { token: generateToken(user), user };
      if (!user.otp || new Date() > user.otpExpires) throw new Error("OTP expired");
      if (user.otp !== otp) throw new Error("Invalid OTP");
      user.otp = null; user.otpExpires = null; user.verified = true;
      await user.save();
      return { token: generateToken(user), user };
    },

    login: async (_, { username, password }) => {
      const user = await User.findOne({ username: username.toLowerCase().trim() });
      if (!user) throw new Error("Invalid credentials");
      if (!user.verified) throw new Error("Please verify your account first");
      const ok = await bcrypt.compare(password, user.password||"");
      if (!ok) throw new Error("Invalid credentials");
      return { token: generateToken(user), user };
    },

    register: async (_, { fullName, email, password, role }) => {
      const ne = email.toLowerCase().trim();
      let user = await User.findOne({ email: ne });
      if (user?.verified) throw new Error("Email already registered");
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      if (!user) user = await User.create({ fullName, username: ne.split("@")[0], email: ne, password: hashedPassword, role: role||"user", otp, otpExpires, verified: false });
      else { user.fullName = fullName; user.password = hashedPassword; user.otp = otp; user.otpExpires = otpExpires; await user.save(); }
      sendOtpEmail(ne, otp, fullName).catch(err => console.error("Email send error:", err.message));
      return { success: true, message: "OTP sent to your email" };
    },

    sendOtp: async (_, { email }) => {
      let user = await User.findOne({ email });
      if (!user) user = await User.create({ fullName: email.split("@")[0], username: email.split("@")[0], email, password: "", role: "user", verified: false });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      sendOtpEmail(email, otp, user.fullName).catch(err => console.error("Email send error:", err.message));
      return { success: true, message: "OTP sent" };
    },

    verifyOtp: async (_, { email, otp }) => {
      const user = await User.findOne({ email });
      if (!user) throw new Error("User not found");
      if (user.verified) return { token: generateToken(user), user };
      if (user.otp !== otp) throw new Error("Invalid OTP");
      user.otp = null; user.otpExpires = null; user.verified = true;
      await user.save();
      return { token: generateToken(user), user };
    },

    createEvent: async (_, { input }, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const slug = `${toSlug(input.title)}-${Date.now().toString().slice(-6)}`;
      const event = await Event.create({ ...input, slug, organizerId: ctx.user.sub||ctx.user.id, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, status: "upcoming" });
      return { success: true, message: "Event created", event: await serializeEvent(event) };
    },

    updateEvent: async (_, { slug, input }, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      if (event.organizerId !== (ctx.user.sub||ctx.user.id)) throw new Error("Only organizer can update");
      Object.assign(event, input);
      if (input.startsAt) event.startsAt = new Date(input.startsAt);
      await event.save();
      return { success: true, message: "Event updated", event: await serializeEvent(event) };
    },

    deleteEvent: async (_, { slug }, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      if (event.organizerId !== (ctx.user.sub||ctx.user.id)) throw new Error("Only organizer can delete");
      await event.deleteOne();
      return { success: true, message: "Event deleted", event: null };
    },

    registerForEvent: async (_, { slug, input }, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      await event.loadParticipants();
      const userId = ctx.user.sub||ctx.user.id;
      if (event.participants.some(p => p.userId === userId)) throw new Error("Already registered");
      const attendee = { userId, fullName: input?.fullName||"", email: input?.email||"", phone: input?.phone||"", note: input?.note||"" };
      let message;
      if (event.currentParticipants < event.maxParticipants) { event.participants.push(attendee); event.currentParticipants++; message = "Registration successful"; }
      else { event.waitlist.push(attendee); event.waitlistCount++; message = "Added to waitlist"; }
      await event.save();
      return { success: true, message, event: await serializeEvent(event) };
    },

    cancelRegistration: async (_, { slug }, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const event = await Event.findOne({ slug });
      if (!event) throw new Error("Event not found");
      await event.loadParticipants();
      const userId = ctx.user.sub||ctx.user.id;
      const pi = event.participants.findIndex(p => p.userId === userId);
      if (pi >= 0) {
        event.participants.splice(pi, 1); event.currentParticipants = Math.max(0, event.currentParticipants-1);
        if (event.waitlist.length > 0) { event.participants.push(event.waitlist.shift()); event.currentParticipants++; event.waitlistCount = Math.max(0, event.waitlistCount-1); }
      } else {
        const wi = event.waitlist.findIndex(p => p.userId === userId);
        if (wi < 0) throw new Error("Registration not found");
        event.waitlist.splice(wi, 1); event.waitlistCount = Math.max(0, event.waitlistCount-1);
      }
      await event.save();
      return { success: true, message: "Registration cancelled", event: await serializeEvent(event) };
    },

    createDonation: async (_, { input }, ctx) => {
      if (!ctx.user) throw new Error("Authentication required");
      const { eventId, amount, item, quantity, type, message } = input;
      if (type === "monetary" && (!amount || amount <= 0)) throw new Error("Valid amount required");
      if (type === "item" && (!item || !quantity)) throw new Error("Item and quantity required");
      const donation = await Donation.create({
        eventId, donorId: ctx.user.sub||ctx.user.id,
        donorName: ctx.user.username||ctx.user.fullName||"Anonymous",
        amount: type === "monetary" ? amount : 0,
        item: type === "item" ? item : null,
        quantity: type === "item" ? quantity : null,
        type, status: "completed", message
      });
      return { ...donation, createdAt: toIso(donation.createdAt) };
    },
  },
};

module.exports = resolvers;
