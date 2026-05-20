const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const c = require("../controllers/eventController");
const router = express.Router();

router.get("/", c.listEvents);
router.get("/dashboard", requireAuth, c.getOrganizerDashboard);
router.get("/:slug", c.getEventBySlug);
router.get("/:slug/participants", requireAuth, c.getParticipants);
router.post("/", requireAuth, c.createEvent);
router.patch("/:slug", requireAuth, c.updateEvent);
router.delete("/:slug", requireAuth, c.deleteEvent);
router.post("/:slug/register", requireAuth, c.registerForEvent);
router.post("/:slug/cancel", requireAuth, c.cancelRegistration);

module.exports = router;
