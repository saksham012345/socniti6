const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const c = require("../controllers/eventController");
const Event = require("../models/Event");
const EventVerification = require("../models/EventVerification");
const router = express.Router();

router.get("/", c.listEvents);
router.get("/dashboard", requireAuth, c.getOrganizerDashboard);
router.get("/pending", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const events = await Event.find({ status: "pending" }, { startsAt: 1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/:slug", c.getEventBySlug);
router.get("/:slug/participants", requireAuth, c.getParticipants);
router.post("/", requireAuth, c.createEvent);
router.patch("/:slug", requireAuth, c.updateEvent);
router.delete("/:slug", requireAuth, c.deleteEvent);
router.post("/:slug/register", requireAuth, c.registerForEvent);
router.post("/:slug/cancel", requireAuth, c.cancelRegistration);
router.post("/:slug/approve", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "upcoming";
    await event.save();

    let verification = await EventVerification.findByEventId(event.id);
    if (!verification) {
      verification = await EventVerification.create({ eventId: event.id });
    }
        verification = await EventVerification.approve(
          event.id,
          req.user.sub || req.user.id,
          req.body?.notes || "Approved by admin"
        );

        // mark organizer verified for this event
        event.organizerVerified = true;
        await event.save();

    res.json({ message: "Event approved", event, verification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:slug/verify-organizer', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.organizerVerified = true;
    await event.save();
    res.json({ message: 'Organizer verified for event', event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/:slug/reject", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "cancelled";
    await event.save();

    let verification = await EventVerification.findByEventId(event.id);
    if (!verification) {
      verification = await EventVerification.create({ eventId: event.id });
    }
    verification = await EventVerification.reject(
      event.id,
      req.user.sub || req.user.id,
      req.body?.reason || "Rejected by admin"
    );

    res.json({ message: "Event rejected", event, verification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
