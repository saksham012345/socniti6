const express = require("express");
const { requireAuth } = require("../middleware/auth");
const Donation = require("../models/Donation");
const router = express.Router();

router.get("/event/:eventId", async (req, res) => {
  try {
    const donations = await Donation.find({ eventId: req.params.eventId });
    const stats = {
      totalMonetary: donations.filter(d => d.type === "monetary" && d.status === "completed").reduce((s, d) => s + d.amount, 0),
      totalItems: donations.filter(d => d.type === "item" && d.status === "completed").length,
      totalDonations: donations.filter(d => d.status === "completed").length,
    };
    res.json({ donations, stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { eventId, amount, item, quantity, type, message } = req.body;
    if (!eventId || !type) return res.status(400).json({ error: "eventId and type required" });
    if (type === "monetary" && (!amount || amount <= 0)) return res.status(400).json({ error: "Valid amount required" });
    if (type === "item" && (!item || !quantity)) return res.status(400).json({ error: "Item and quantity required" });
    const donation = await Donation.create({
      eventId, donorId: req.user.sub || req.user.id,
      donorName: req.user.username || req.user.fullName || "Anonymous",
      amount: type === "monetary" ? amount : 0,
      item: type === "item" ? item : null,
      quantity: type === "item" ? quantity : null,
      type, status: "completed", message,
    });
    res.status(201).json({ donation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
