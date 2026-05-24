const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const Ticket = require("../models/Ticket");
const TicketMessage = require("../models/TicketMessage");

const router = express.Router();

const ticketSenderRole = (role) => ["admin", "agent"].includes(role) ? role : "user";

const canAccessTicket = (user, ticket) => {
  const userId = user.sub || user.id;
  return user.role === "admin" || user.role === "agent" || ticket.userId === userId;
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const conditions = {};
    if (req.query.status && req.query.status !== "all") conditions.status = req.query.status;
    if (req.query.priority && req.query.priority !== "all") conditions.priority = req.query.priority;
    if (req.query.assignedTo && req.query.assignedTo !== "all") conditions.assignedTo = req.query.assignedTo;

    let tickets = await Ticket.find(conditions);
    if (req.user.role !== "admin" && req.user.role !== "agent") {
      const userId = req.user.sub || req.user.id;
      tickets = tickets.filter(ticket => ticket.userId === userId);
    }

    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    if (!req.body.subject?.trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const ticket = await Ticket.create({
      userId: req.user.sub || req.user.id,
      userName: req.user.fullName || req.user.username || "User",
      userEmail: req.user.email || null,
      subject: req.body.subject.trim(),
      description: req.body.description || null,
      priority: req.body.priority || "medium"
    });

    if (req.body.description?.trim()) {
      await TicketMessage.create({
        ticketId: ticket.id,
        senderId: req.user.sub || req.user.id,
        senderName: req.user.fullName || req.user.username || "User",
        senderRole: ticketSenderRole(req.user.role),
        content: req.body.description.trim()
      });
    }

    req.app.get("io")?.to("ticket-agents").emit("ticket-created", ticket);
    res.status(201).json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:ticketId", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ message: "Insufficient permissions" });

    const messages = await TicketMessage.findByTicketId(ticket.id);
    res.json({ ticket, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:ticketId/messages", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ message: "Insufficient permissions" });

    const messages = await TicketMessage.findByTicketId(ticket.id);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:ticketId/messages", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ message: "Insufficient permissions" });
    if (!req.body.content?.trim()) return res.status(400).json({ message: "Message is required" });

    const message = await TicketMessage.create({
      ticketId: ticket.id,
      senderId: req.user.sub || req.user.id,
      senderName: req.user.fullName || req.user.username || "User",
      senderRole: ticketSenderRole(req.user.role),
      content: req.body.content.trim()
    });

    if (ticket.status === "open" && req.user.role !== "user") {
      const updated = await Ticket.update(ticket.id, { status: "in-progress", assignedTo: req.user.sub || req.user.id });
      req.app.get("io")?.to(`ticket-${ticket.id}`).emit("ticket-updated", updated);
      req.app.get("io")?.to("ticket-agents").emit("ticket-updated", updated);
    }

    req.app.get("io")?.to(`ticket-${ticket.id}`).emit("ticket-message", message);
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:ticketId", requireAuth, requireRole("admin", "agent"), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const updated = await Ticket.update(ticket.id, {
      status: req.body.status,
      priority: req.body.priority,
      assignedTo: req.body.assignedTo
    });

    req.app.get("io")?.to(`ticket-${ticket.id}`).emit("ticket-updated", updated);
    req.app.get("io")?.to("ticket-agents").emit("ticket-updated", updated);
    res.json({ ticket: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:ticketId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await Ticket.delete(req.params.ticketId);
    res.json({ message: "Ticket deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
