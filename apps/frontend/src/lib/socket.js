import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) return socket;
  const url = process.env.REACT_APP_API_URL || "";
  socket = io(url || window.location.origin, {
    auth: { token: token || localStorage.getItem("socniti_token") || "" },
    autoConnect: true,
  });
  socket.on("connect_error", (err) => console.warn("Socket connect error:", err.message));
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export default { connectSocket, getSocket, disconnectSocket };
