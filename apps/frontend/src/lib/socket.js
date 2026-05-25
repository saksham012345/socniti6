import { io } from "socket.io-client";
import { BACKEND_URL } from "./api";

let socket = null;
const noopSocket = {
  connected: false,
  on: () => noopSocket,
  off: () => noopSocket,
  emit: () => noopSocket,
  disconnect: () => {},
};

export function connectSocket(token) {
  if (socket && socket.connected) return socket;
  const authToken = token || localStorage.getItem("socniti_token") || "";
  if (!authToken) return noopSocket;

  socket = io(BACKEND_URL, {
    auth: { token: authToken },
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
