import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Clock, Loader2, MessageSquare, Send } from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL, eventApi } from "../lib/api";

const socketUrl = BACKEND_URL.replace(/\/$/, "");

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  waiting: "bg-gray-100 text-gray-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

export default function AgentDashboardPage() {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeTicketId = activeTicket?.id;

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socket.on("ticket-created", (ticket) => {
      setTickets(current => upsertTicket(current, ticket));
    });
    socket.on("ticket-updated", (ticket) => {
      setTickets(current => upsertTicket(current, ticket));
      setActiveTicket(current => current?.id === ticket.id ? ticket : current);
    });
    socket.on("ticket-message-history", (history) => setMessages(dedupeMessages(history)));
    socket.on("ticket-message", (message) => {
      setMessages(current => dedupeMessages([...current, message]));
      setTickets(current => current.map(ticket =>
        ticket.id === message.ticketId ? { ...ticket, updatedAt: message.createdAt } : ticket
      ));
    });
    socket.on("connect_error", () => toast.error("Live support connection failed"));

    socketRef.current = socket;
    return () => socket.disconnect();
  }, [token]);

  useEffect(() => {
    if (socketRef.current && activeTicketId) {
      socketRef.current.emit("join-ticket", activeTicketId);
    }
  }, [activeTicketId]);

  const visibleTickets = useMemo(() => {
    return tickets
      .filter(ticket => filter === "all" || ticket.status === filter)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [tickets, filter]);

  const upsertTicket = (items, ticket) => {
    const exists = items.some(item => item.id === ticket.id);
    if (exists) return items.map(item => item.id === ticket.id ? ticket : item);
    return [ticket, ...items];
  };

  const dedupeMessages = (items) => {
    const seen = new Set();
    return items.filter(item => {
      const key = item.id || `${item.senderId}-${item.createdAt}-${item.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = filter === "all" ? "" : `?status=${filter}`;
      const res = await eventApi.get(`/api/tickets${params}`);
      setTickets(res.data.tickets || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticket) => {
    setActiveTicket(ticket);
    setMessages([]);
    try {
      const res = await eventApi.get(`/api/tickets/${ticket.id}/messages`);
      setMessages(dedupeMessages(res.data.messages || []));
      socketRef.current?.emit("join-ticket", ticket.id);
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

  const updateTicket = async (updates) => {
    if (!activeTicket) return;
    try {
      const res = await eventApi.patch(`/api/tickets/${activeTicket.id}`, updates);
      setActiveTicket(res.data.ticket);
      setTickets(current => upsertTicket(current, res.data.ticket));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update ticket");
    }
  };

  const canReply = activeTicket && !["resolved", "closed"].includes(activeTicket.status);

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-1/3 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white">
        <div className="flex items-center justify-between border-b border-ink/10 bg-mist/50 p-4">
          <div>
            <h2 className="font-bold text-ink">Support Tickets</h2>
            <p className="text-xs text-ink/50">Live queue for agents</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-ink/20 bg-white px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-leaf" size={24} /></div>
          ) : visibleTickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/50">No tickets found.</p>
          ) : (
            visibleTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  activeTicket?.id === ticket.id ? "border-leaf bg-leaf/5" : "border-ink/10 hover:bg-mist"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-ink">{ticket.subject}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </div>
                <p className="mb-2 text-xs text-ink/60">From: {ticket.userName}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-ink/50">{new Date(ticket.createdAt).toLocaleDateString("en-IN")}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex w-2/3 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white">
        {activeTicket ? (
          <>
            <div className="flex items-center justify-between border-b border-ink/10 bg-mist/50 p-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-ink">{activeTicket.subject}</h2>
                <p className="text-sm text-ink/60">From: {activeTicket.userName} {activeTicket.userEmail ? `(${activeTicket.userEmail})` : ""}</p>
              </div>
              <div className="flex gap-2">
                {activeTicket.status === "open" && (
                  <button
                    onClick={() => updateTicket({ status: "in-progress", assignedTo: user?.id })}
                    className="flex items-center gap-2 rounded-lg bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90"
                  >
                    <Clock size={16} /> In Progress
                  </button>
                )}
                {activeTicket.status !== "resolved" && activeTicket.status !== "closed" && (
                  <button
                    onClick={() => updateTicket({ status: "resolved" })}
                    className="flex items-center gap-2 rounded-lg bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/90"
                  >
                    <CheckCircle size={16} /> Resolve
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
              {activeTicket.description && (
                <div className="rounded-lg border border-ink/10 bg-white p-4">
                  <p className="mb-2 text-xs font-semibold text-ink/60">Initial Description</p>
                  <p className="text-sm text-ink">{activeTicket.description}</p>
                </div>
              )}
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">No messages yet. Start replying to the user.</p>
              ) : (
                messages.map(message => {
                  const isMe = message.senderId === user?.id;
                  return (
                    <div key={message.id || `${message.senderId}-${message.createdAt}`} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <span className="mb-1 px-2 text-xs font-semibold text-ink/50">
                        {message.senderName} <span className="text-ink/40">({message.senderRole})</span>
                      </span>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? "rounded-tr-sm bg-leaf text-white" : "rounded-tl-sm border border-ink/10 bg-white text-ink"}`}>
                        {message.content}
                      </div>
                      <span className="mt-1 px-2 text-xs text-ink/40">{new Date(message.createdAt).toLocaleTimeString("en-IN")}</span>
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
                  placeholder="Type your reply..."
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-3 outline-none focus:ring-2 focus:ring-leaf"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="rounded-lg bg-leaf px-4 py-3 text-white disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <div className="border-t border-ink/10 bg-green-50 p-4 text-center text-sm font-semibold text-green-800">
                Ticket is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-ink/40">
            <MessageSquare size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-semibold">Select a ticket to respond</p>
            <p className="mt-2 text-sm">New messages and tickets appear here live.</p>
          </div>
        )}
      </div>
    </div>
  );
}
