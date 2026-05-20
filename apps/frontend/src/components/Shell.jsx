import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Home, Calendar, Heart, Phone, User, Menu, X } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = user
    ? user.fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : "";

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
              <div className="relative">
                <button type="button" onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 py-1.5 pr-3 pl-1.5 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:bg-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">
                    {initials || "U"}
                  </span>
                  <span className="hidden sm:block text-sm font-semibold">{user.fullName.split(" ")[0]}</span>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft z-20">
                      <div className="px-4 py-3 border-b border-ink/10">
                        <p className="text-sm font-bold text-ink">{user.fullName}</p>
                        <p className="text-xs text-ink/50">{user.email}</p>
                      </div>
                      {[
                        { label: "View Profile", path: "/profile" },
                        { label: "Dashboard", path: "/dashboard" },
                        { label: "Settings", path: "/settings" },
                        { label: "Support Tickets", path: "/support" },
                        ...(user.role === "admin" ? [{ label: "Admin Dashboard", path: "/admin" }] : []),
                        ...(["admin", "agent"].includes(user.role) ? [{ label: "Agent Dashboard", path: "/agent" }] : []),
                      ].map(item => (
                        <button key={item.path} type="button"
                          onClick={() => { navigate(item.path); setMenuOpen(false); }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-mist transition-colors">
                          {item.label}
                        </button>
                      ))}
                      <div className="border-t border-ink/10" />
                      <button type="button"
                        onClick={() => { logout(); setMenuOpen(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-ember hover:bg-ember/10 transition-colors">
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
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
