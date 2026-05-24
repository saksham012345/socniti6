import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, X, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import io from "socket.io-client";

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchTicketDetails();
    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSocket = () => {
    try {
      const token = localStorage.getItem("token");
      socketRef.current = io("http://localhost:4002", {
        auth: { token },
        transports: ["websocket", "polling"]
      });

      socketRef.current.on("connect", () => {
        socketRef.current.emit("join-ticket", ticketId);
      });

      socketRef.current.on("ticket-message", (data) => {
        setMessages((prev) => [...prev, data]);
      });

      socketRef.current.on("ticket-updated", (data) => {
        setTicket(data);
      });
    } catch (err) {
      console.error("Socket connection error:", err);
    }
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4002/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setMessages(data.messages || []);
      } else {
        toast.error("Failed to load ticket");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error("Error loading ticket");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:4002/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: newMessage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");

        // Emit via socket
        if (socketRef.current) {
          socketRef.current.emit("ticket-message", {
            ticketId,
            message: data.message
          });
        }
      }
    } catch (err) {
      toast.error("Failed to send message");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <p className="text-ink/60">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-ink/60">Ticket not found</p>
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-2 text-leaf hover:text-leaf/80 font-semibold"
        >
          ← Back to Tickets
        </button>
        <div className="bg-white rounded-2xl border border-ink/10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-ink">{ticket.subject}</h1>
              <p className="text-ink/60 mt-1">Ticket ID: {ticket.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[ticket.priority]}`}>
              <AlertCircle size={14} className="mr-1" />
              {ticket.priority.toUpperCase()} Priority
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[ticket.status]}`}>
              <Clock size={14} className="mr-1" />
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
            {ticket.assignedTo && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-leaf/10 text-leaf">
                Assigned to: {ticket.assignedTo}
              </span>
            )}
          </div>

          {ticket.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-ink/70">
              {ticket.description}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden flex flex-col h-[600px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-ink/60">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.senderId === user.id
                      ? "bg-leaf text-white"
                      : "bg-white border border-ink/10 text-ink"
                  }`}
                >
                  {msg.senderRole !== "user" && (
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {msg.senderName} ({msg.senderRole})
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="border-t border-ink/10 p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leaf focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 bg-leaf text-white rounded-lg hover:bg-leaf/90 disabled:opacity-50 transition flex items-center gap-2"
            >
              <Send size={18} />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
