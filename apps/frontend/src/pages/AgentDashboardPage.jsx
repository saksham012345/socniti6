import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, CheckCircle } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef(null);
  const [filter, setFilter] = useState("open");

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4003/api/chat/tickets?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTickets(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTicket = (ticket) => {
    setActiveTicket(ticket);
    setMessages([]);
    const token = localStorage.getItem("token");

    if (socketRef.current) socketRef.current.disconnect();

    const newSocket = io("http://localhost:4003", {
      auth: { token }
    });

    newSocket.on("connect", () => {
      newSocket.emit("join-ticket", ticket.id);
    });

    newSocket.on("ticket-message-history", (history) => {
      setMessages(history);
    });

    newSocket.on("new-ticket-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current = newSocket;
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket || !socketRef.current) return;
    
    socketRef.current.emit("send-ticket-message", {
      ticketId: activeTicket.id,
      content: newMessage
    });
    setNewMessage("");
  };

  const resolveTicket = async () => {
    if (!activeTicket) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4003/api/chat/tickets/${activeTicket.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "closed" })
      });
      if (res.ok) {
        fetchTickets();
        setActiveTicket(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex h-[calc(100vh-80px)] gap-6">
      {/* Sidebar - Tickets List */}
      <div className="w-1/3 flex flex-col bg-white rounded-2xl border border-ink/10 overflow-hidden">
        <div className="p-4 border-b border-ink/10 flex justify-between items-center bg-mist/50">
          <h2 className="font-bold text-lg">Agent Workspace</h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm bg-white border border-ink/20 rounded-lg px-2 py-1"
          >
            <option value="">All Tickets</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.map(t => (
            <div key={t.id} onClick={() => openTicket(t)}
              className={`p-4 rounded-xl cursor-pointer border transition-colors ${
                activeTicket?.id === t.id ? "border-ink bg-mist" : "border-ink/10 hover:border-ink/30"
              }`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold truncate pr-4 text-sm">{t.subject}</h3>
              </div>
              <p className="text-xs text-ink/60 font-semibold mb-1">User: {t.userName}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] text-ink/50">{new Date(t.createdAt).toLocaleDateString()}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-leaf/20 text-leaf'}`}>
                  {t.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-ink/50 text-sm text-center py-4">No tickets found.</p>}
        </div>
      </div>

      {/* Main Content - Chat Area */}
      <div className="w-2/3 flex flex-col bg-white rounded-2xl border border-ink/10 overflow-hidden relative">
        {activeTicket ? (
          <>
            <div className="p-4 border-b border-ink/10 bg-mist/50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">{activeTicket.subject}</h2>
                <p className="text-sm text-ink/60">Requested by: {activeTicket.userName}</p>
              </div>
              {activeTicket.status === 'open' && (
                <button 
                  onClick={resolveTicket}
                  className="flex items-center gap-2 bg-leaf text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-leaf/90 transition-colors"
                >
                  <CheckCircle size={16} /> Resolve Ticket
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => {
                const isMe = m.senderId === user.id;
                return (
                  <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-ink/50 mb-1 px-2">{m.senderName} {m.senderId === activeTicket.userId ? "(User)" : "(Agent)"}</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? "bg-ink text-white rounded-tr-sm" : "bg-mist text-ink rounded-tl-sm"}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeTicket.status === 'open' ? (
              <form onSubmit={sendMessage} className="p-4 border-t border-ink/10 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Type a reply to the user..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 bg-mist rounded-xl focus:outline-none"
                />
                <button type="submit" className="px-4 py-3 bg-ink text-white rounded-xl hover:bg-ink/90">
                  <Send size={20} />
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-ink/10 bg-mist/50 text-center text-sm font-semibold text-ink/60">
                Ticket resolved and closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-ink/40">
            <MessageSquare size={64} className="mb-4 opacity-50" />
            <p className="font-semibold text-lg">Select a ticket to respond</p>
          </div>
        )}
      </div>
    </div>
  );
}
