import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../lib/api";
import toast from "react-hot-toast";
import { Send, Users, Loader2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function EventChat({ eventId }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { token, user } = useAuth();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO
  useEffect(() => {
    if (!token || !eventId) return;

    const newSocket = io(BACKEND_URL.replace(/\/$/, ""), {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    newSocket.on("connect", () => {
      console.log("Connected to chat");
      setConnected(true);
      setLoading(false);
      newSocket.emit("join-event", eventId);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from chat");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      toast.error("Failed to connect to chat");
      setLoading(false);
    });

    newSocket.on("message-history", (history) => {
      setMessages(history);
    });

    newSocket.on("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("user-joined", (data) => {
      toast.success(`${data.username} joined the chat`);
    });

    newSocket.on("user-left", (data) => {
      toast(`${data.username} left the chat`);
    });

    newSocket.on("user-typing", (data) => {
      setTypingUsers((prev) => new Set(prev).add(data.username));
      setTimeout(() => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }, 3000);
    });

    newSocket.on("user-stop-typing", (data) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.username);
        return newSet;
      });
    });

    newSocket.on("error", (error) => {
      toast.error(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave-event", eventId);
      newSocket.close();
    };
  }, [token, eventId]);

  const handleTyping = () => {
    if (!socket || !connected) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { eventId });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop-typing", { eventId });
    }, 1000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !connected) return;

    socket.emit("send-message", {
      eventId,
      content: newMessage.trim()
    });

    setNewMessage("");
    setIsTyping(false);
    socket.emit("stop-typing", { eventId });
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Join the Conversation</h3>
        <p className="text-gray-600 mb-4">Please log in to participate in the event chat</p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-gray-600">Connecting to chat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-white" />
            <div>
              <h3 className="text-lg font-semibold text-white">Event Chat</h3>
              <p className="text-indigo-100 text-sm">
                {connected ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <Users className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === user.id;
            return (
              <div
                key={message.id || message._id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
                  {!isOwnMessage && (
                    <p className="text-xs font-medium text-gray-600 mb-1 px-1">
                      {message.senderName}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white text-gray-900 rounded-bl-sm shadow-sm"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-indigo-200" : "text-gray-500"
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            disabled={!connected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !connected}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            <Send className="h-5 w-5" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
