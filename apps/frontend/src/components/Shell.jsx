import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Calendar,
  Headphones,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  Settings,
  ShieldCheck,
  Ticket,
  User,
  X
} from "lucide-react";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/donations", label: "Donate", icon: Heart },
  { to: "/contact", label: "Contact", icon: Phone },
];

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountSidebarOpen, setAccountSidebarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = user
    ? user.fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : "";
  const accountLinks = user
    ? [
        { label: "View Profile", path: "/profile", icon: User },
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Settings", path: "/settings", icon: Settings },
        { label: "Support Tickets", path: "/support", icon: Ticket },
        ...(user.role === "admin" ? [{ label: "Admin Dashboard", path: "/admin", icon: ShieldCheck }] : []),
        ...(["admin", "agent"].includes(user.role) ? [{ label: "Agent Dashboard", path: "/agent", icon: Headphones }] : []),
      ]
    : [];

  const goToAccountPath = (path) => {
    navigate(path);
    setAccountSidebarOpen(false);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Desktop / Mobile Top Header ── */}
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-mist/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          {/* Logo */}
          <NavLink to="/" className="font-display text-xl sm:text-2xl font-bold text-ink">
            SOCNITI
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${isActive ? "text-ink" : "text-ink/60 hover:text-ink"}`
                }>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <button type="button" onClick={() => setAccountSidebarOpen(true)}
                className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 py-1.5 pr-3 pl-1.5 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:bg-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">
                  {initials || "U"}
                </span>
                <span className="hidden sm:block text-sm font-semibold">{user.fullName.split(" ")[0]}</span>
              </button>
            ) : (
              <NavLink to="/login"
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 transition-colors">
                Login
              </NavLink>
            )}

            {/* Mobile hamburger (only shows on small screens, for extra menu) */}
            <button className="md:hidden flex h-9 w-9 items-center justify-center rounded-full hover:bg-mist"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-ink/10 bg-white px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${isActive ? "bg-ink text-white" : "text-ink hover:bg-mist"}`
                }>
                <link.icon size={18} />
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {user && accountSidebarOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setAccountSidebarOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="border-b border-ink/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-leaf text-sm font-bold text-white">
                    {initials || "U"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-ink">{user.fullName}</p>
                    <p className="truncate text-sm text-ink/50">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountSidebarOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-mist"
                  aria-label="Close account sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {accountLinks.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => goToAccountPath(item.path)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      active ? "bg-ink text-white" : "text-ink hover:bg-mist"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-ink/10 p-4">
              <button
                type="button"
                onClick={() => {
                  logout();
                  setAccountSidebarOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-ember hover:bg-ember/10"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Mobile Bottom Navigation (app-style) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-ink/10 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navLinks.map(link => {
            const isActive = location.pathname === link.to ||
              (link.to !== "/" && location.pathname.startsWith(link.to));
            return (
              <NavLink key={link.to} to={link.to}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${isActive ? "bg-ink text-white" : "text-ink/50"}`}>
                  <link.icon size={20} />
                </span>
                <span className={`text-[10px] font-semibold ${isActive ? "text-ink" : "text-ink/40"}`}>
                  {link.label}
                </span>
              </NavLink>
            );
          })}

          {/* Profile tab in bottom nav */}
          <button onClick={() => navigate(user ? "/profile" : "/login")}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
              location.pathname === "/profile" ? "bg-ink text-white" : "bg-leaf/10 text-leaf"
            }`}>
              {user ? (
                <span className="text-xs font-bold">{initials || <User size={18} />}</span>
              ) : (
                <User size={20} />
              )}
            </span>
            <span className={`text-[10px] font-semibold ${location.pathname === "/profile" ? "text-ink" : "text-ink/40"}`}>
              {user ? "Me" : "Login"}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
