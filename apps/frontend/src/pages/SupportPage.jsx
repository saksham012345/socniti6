import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, MessageSquare, Plus, Send, X } from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL, eventApi } from "../lib/api";

const socketUrl = BACKEND_URL.replace(/\/$/, "");

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  waiting: "bg-gray-100 text-gray-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

export default function SupportPage() {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "medium"
  });
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeTicketId = activeTicket?.id;

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token || !activeTicketId) return undefined;

    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => socket.emit("join-ticket", activeTicketId));
    socket.on("ticket-message-history", (history) => setMessages(dedupeMessages(history)));
    socket.on("ticket-message", (message) => {
      setMessages(current => dedupeMessages([...current, message]));
    });
    socket.on("ticket-updated", (ticket) => {
      setTickets(current => current.map(item => item.id === ticket.id ? ticket : item));
      setActiveTicket(current => current?.id === ticket.id ? ticket : current);
    });
    socket.on("connect_error", () => toast.error("Live support connection failed"));

    socketRef.current = socket;
    return () => socket.disconnect();
  }, [activeTicketId, token]);

  const dedupeMessages = (items) => {
    const seen = new Set();
    return items.filter(item => {
      const key = item.id || `${item.senderId}-${item.createdAt}-${item.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [tickets]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await eventApi.get("/api/tickets");
      setTickets(res.data.tickets || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim()) {
      toast.error("Please add a subject");
      return;
    }

    try {
      setCreating(true);
      const res = await eventApi.post("/api/tickets", ticketForm);
      const ticket = res.data.ticket;
      setTickets(current => [ticket, ...current]);
      setShowNewTicket(false);
      setTicketForm({ subject: "", description: "", priority: "medium" });
      await openTicket(ticket);
      toast.success("Ticket created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const openTicket = async (ticket) => {
    setActiveTicket(ticket);
    setMessages([]);
    try {
      const res = await eventApi.get(`/api/tickets/${ticket.id}/messages`);
      setMessages(dedupeMessages(res.data.messages || []));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load messages");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket) return;

    try {
      setSending(true);
      await eventApi.post(`/api/tickets/${activeTicket.id}/messages`, {
        content: newMessage
      });
      setNewMessage("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const canReply = activeTicket && !["resolved", "closed"].includes(activeTicket.status);

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <div className={`${showNewTicket || activeTicket ? "hidden md:flex" : "flex"} w-full flex-col overflow-hidden rounded-xl border border-ink/10 bg-white md:w-1/3`}>
        <div className="flex items-center justify-between border-b border-ink/10 bg-mist/50 p-4">
          <div>
            <h2 className="font-bold text-ink">My Tickets</h2>
            <p className="text-xs text-ink/50">Raise an issue and chat with support live.</p>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white hover:bg-ink/90"
            title="Create ticket"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-leaf" size={24} /></div>
          ) : sortedTickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/15 p-6 text-center">
              <AlertCircle className="mx-auto mb-3 text-ink/30" size={28} />
              <p className="text-sm font-semibold text-ink">No tickets yet</p>
              <button onClick={() => setShowNewTicket(true)} className="mt-3 rounded-lg bg-leaf px-4 py-2 text-sm font-semibold text-white">
                Raise Ticket
              </button>
            </div>
          ) : (
            sortedTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  activeTicket?.id === ticket.id ? "border-leaf bg-leaf/5" : "border-ink/10 hover:bg-mist"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-bold text-ink">{ticket.subject}</p>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink/50">
                  {ticket.priority} priority · {new Date(ticket.createdAt).toLocaleDateString("en-IN")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${showNewTicket || activeTicket ? "flex" : "hidden md:flex"} w-full flex-1 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white`}>
        {showNewTicket ? (
          <div className="flex h-full items-center justify-center p-8">
            <form onSubmit={createTicket} className="w-full max-w-lg rounded-xl border border-ink/10 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-ink">Raise a Support Ticket</h2>
                <button type="button" onClick={() => setShowNewTicket(false)} className="rounded-lg p-2 hover:bg-mist">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm(form => ({ ...form, subject: e.target.value }))}
                  placeholder="Short subject"
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 outline-none focus:border-leaf"
                />
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm(form => ({ ...form, description: e.target.value }))}
                  rows={5}
                  placeholder="Describe what happened"
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 outline-none focus:border-leaf"
                />
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm(form => ({ ...form, priority: e.target.value }))}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 outline-none focus:border-leaf"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent priority</option>
                </select>
                <button disabled={creating} className="w-full rounded-lg bg-leaf px-4 py-3 font-semibold text-white disabled:opacity-50">
                  {creating ? "Creating..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        ) : activeTicket ? (
          <>
            <div className="border-b border-ink/10 bg-mist/50 p-4">
              <button onClick={() => setActiveTicket(null)} className="mb-2 text-xs font-semibold text-leaf md:hidden">Back to tickets</button>
              <h2 className="font-bold text-ink">{activeTicket.subject}</h2>
              <p className="text-sm text-ink/60">Ticket #{activeTicket.id.slice(0, 8)} · {activeTicket.status}</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
              {activeTicket.description && (
                <div className="rounded-lg border border-ink/10 bg-white p-4 text-sm text-ink/70">{activeTicket.description}</div>
              )}
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">No messages yet.</p>
              ) : (
                messages.map(message => {
                  const isMe = message.senderId === user?.id;
                  return (
                    <div key={message.id || `${message.senderId}-${message.createdAt}`} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <span className="mb-1 px-2 text-xs font-semibold text-ink/50">{message.senderName}</span>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${isMe ? "rounded-tr-sm bg-ink text-white" : "rounded-tl-sm bg-white text-ink"}`}>
                        {message.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            {canReply ? (
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-ink/10 bg-white p-4">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg bg-mist px-4 py-3 outline-none focus:ring-2 focus:ring-leaf"
                />
                <button disabled={sending || !newMessage.trim()} className="rounded-lg bg-ink px-4 py-3 text-white disabled:opacity-50">
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <div className="border-t border-ink/10 bg-green-50 p-4 text-center text-sm font-semibold text-green-800">
                This ticket is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-ink/40">
            <MessageSquare size={60} className="mb-4 opacity-30" />
            <p className="font-semibold">Select a ticket or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
