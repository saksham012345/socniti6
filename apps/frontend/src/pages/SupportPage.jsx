import { useState, useEffect, useRef } from "react";
import { MessageSquare, Plus, Send } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4003/api/chat/tickets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTickets(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4003/api/chat/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subject })
      });
      if (res.ok) {
        const ticket = await res.json();
        setTickets([ticket, ...tickets]);
        setShowNewTicket(false);
        setSubject("");
        openTicket(ticket);
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex h-[calc(100vh-80px)] gap-6">
      {/* Sidebar - Tickets List */}
      <div className="w-1/3 flex flex-col bg-white rounded-2xl border border-ink/10 overflow-hidden">
        <div className="p-4 border-b border-ink/10 flex justify-between items-center bg-mist/50">
          <h2 className="font-bold text-lg">My Tickets</h2>
          <button onClick={() => setShowNewTicket(true)} className="p-2 bg-ink text-white rounded-full hover:bg-ink/90">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tickets.map(t => (
            <div key={t.id} onClick={() => openTicket(t)}
              className={`p-4 rounded-xl cursor-pointer border transition-colors ${
                activeTicket?.id === t.id ? "border-ink bg-mist" : "border-ink/10 hover:border-ink/30"
              }`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold truncate pr-4">{t.subject}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'open' ? 'bg-leaf/20 text-leaf' : 'bg-ink/10 text-ink/60'}`}>
                  {t.status}
                </span>
              </div>
              <p className="text-xs text-ink/50">Created: {new Date(t.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-ink/50 text-sm text-center py-4">No tickets yet.</p>}
        </div>
      </div>

      {/* Main Content - Chat Area */}
      <div className="w-2/3 flex flex-col bg-white rounded-2xl border border-ink/10 overflow-hidden relative">
        {showNewTicket ? (
          <div className="p-8 flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold mb-6">Create New Ticket</h2>
            <form onSubmit={createTicket} className="w-full max-w-md">
              <input
                type="text"
                placeholder="What do you need help with?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full p-4 rounded-xl border border-ink/20 mb-4 focus:outline-none focus:border-ink"
              />
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-ink text-white p-3 rounded-xl font-bold hover:bg-ink/90">Submit</button>
                <button type="button" onClick={() => setShowNewTicket(false)} className="flex-1 border border-ink/20 p-3 rounded-xl font-bold hover:bg-mist">Cancel</button>
              </div>
            </form>
          </div>
        ) : activeTicket ? (
          <>
            <div className="p-4 border-b border-ink/10 bg-mist/50">
              <h2 className="font-bold text-lg">{activeTicket.subject}</h2>
              <p className="text-sm text-ink/60">Ticket #{activeTicket.id.split("-")[0]}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => {
                const isMe = m.senderId === user.id;
                return (
                  <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-ink/50 mb-1 px-2">{m.senderName}</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? "bg-ink text-white rounded-tr-sm" : "bg-mist text-ink rounded-tl-sm"}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeTicket.status === 'open' && (
              <form onSubmit={sendMessage} className="p-4 border-t border-ink/10 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 bg-mist rounded-xl focus:outline-none"
                />
                <button type="submit" className="px-4 py-3 bg-ink text-white rounded-xl hover:bg-ink/90">
                  <Send size={20} />
                </button>
              </form>
            )}
            {activeTicket.status === 'closed' && (
              <div className="p-4 border-t border-ink/10 bg-mist/50 text-center text-sm font-semibold text-ink/60">
                This ticket has been closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-ink/40">
            <MessageSquare size={64} className="mb-4 opacity-50" />
            <p className="font-semibold text-lg">Select a ticket or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
