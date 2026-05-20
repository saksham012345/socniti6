import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { eventApi } from "../lib/api";
import { Plus, MapPin, Calendar, Users, UserPlus, Heart, X, Loader2, RefreshCw, Clock } from "lucide-react";
import CreateEventModal from "../components/CreateEventModal";
import DonationModal from "../components/DonationModal";
import toast from "react-hot-toast";

// Sample events — all set in the future so they always show
const now = new Date();
const future = (days, h = 10) => {
  const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.toISOString();
};

const SAMPLE_EVENTS = [
  { id: "sample-1", title: "Eye Donation Awareness Camp", description: "Join us for an eye donation awareness camp. Learn about the importance of eye donation and pledge to donate your eyes. Free eye checkup available.", category: "Healthcare", locationName: "Lions Club Community Center", city: "Mumbai", state: "Maharashtra", startsAt: future(3), currentParticipants: 45, maxParticipants: 100, slug: "eye-donation-awareness-camp-mumbai", isSample: true },
  { id: "sample-2", title: "Juhu Beach Cleanup Drive", description: "Help us clean Juhu Beach and make it plastic-free. Bring your friends and family for a morning of community service. Gloves and bags provided.", category: "Environment", locationName: "Juhu Beach", city: "Mumbai", state: "Maharashtra", startsAt: future(5, 7), currentParticipants: 78, maxParticipants: 150, slug: "beach-cleanup-drive-juhu", isSample: true },
  { id: "sample-3", title: "Free Medical Health Camp", description: "Free health checkup for underprivileged communities. General screening, blood pressure, diabetes testing, and doctor consultations available.", category: "Healthcare", locationName: "Government School Ground", city: "Delhi", state: "Delhi", startsAt: future(7, 9), currentParticipants: 120, maxParticipants: 200, slug: "free-medical-camp-delhi", isSample: true },
  { id: "sample-4", title: "Tree Plantation Drive", description: "Plant 1000 trees in one day! Join our mission to make Bangalore greener. Saplings and tools will be provided. Refreshments included.", category: "Environment", locationName: "Cubbon Park", city: "Bangalore", state: "Karnataka", startsAt: future(10, 6), currentParticipants: 234, maxParticipants: 500, slug: "tree-plantation-drive-bangalore", isSample: true },
  { id: "sample-5", title: "Blood Donation Camp", description: "Donate blood, save lives. Organized by Indian Red Cross Society. All blood groups needed. Certificate of appreciation provided.", category: "Healthcare", locationName: "City Hospital", city: "Pune", state: "Maharashtra", startsAt: future(4, 8), currentParticipants: 67, maxParticipants: 100, slug: "blood-donation-camp-pune", isSample: true },
  { id: "sample-6", title: "Street Dog Vaccination Drive", description: "Help vaccinate street dogs against rabies. Veterinary team present. Volunteers needed for handling and documentation.", category: "Animal Welfare", locationName: "Sector 15 Market", city: "Noida", state: "Uttar Pradesh", startsAt: future(8, 7), currentParticipants: 23, maxParticipants: 50, slug: "street-dog-vaccination-noida", isSample: true },
];

const categoryColors = {
  Healthcare: "bg-ember/10 text-ember", Environment: "bg-leaf/10 text-leaf",
  "Animal Welfare": "bg-clay/10 text-clay", Education: "bg-ink/10 text-ink",
  "Community Service": "bg-leaf/10 text-leaf", "Disaster Relief": "bg-ember/10 text-ember", Other: "bg-ink/10 text-ink"
};

// ── Join Modal with participant details form ──────────────────────────────────
function JoinEventModal({ event, onClose, onSuccess, alreadyJoined }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: "",
    note: ""
  });

  const isFull = event.currentParticipants >= event.maxParticipants;

  const handleJoin = async () => {
    if (!user) { toast.error("Please login to register"); navigate("/login"); return; }
    if (!form.fullName.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    if (event.isSample) {
      toast.success("Registered successfully!");
      onSuccess();
      onClose();
      return;
    }
    setLoading(true);
    try {
      const res = await eventApi.post(`/api/events/${event.slug}/register`, form);
      toast.success(res.data.message || "Registered successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-soft max-h-[90vh] overflow-y-auto">
        <div className="border-b border-ink/10 px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${categoryColors[event.category] || "bg-leaf/10 text-leaf"}`}>{event.category}</span>
            <h2 className="font-display text-xl font-bold text-ink mt-2">{event.title}</h2>
            <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
              <MapPin size={12} />{event.locationName}, {event.city}
              <span className="mx-1">·</span>
              <Calendar size={12} />{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-mist"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {alreadyJoined ? (
            <div className="rounded-2xl bg-leaf/10 border border-leaf/20 p-4 text-center">
              <p className="text-sm font-semibold text-leaf">✓ You're already registered for this event!</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink/60">Fill in your details to register. The organizer will use this to contact you.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Full Name *</label>
                  <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Email Address *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                    placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                    placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Note for Organizer</label>
                  <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
                    className="w-full rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                    placeholder="Any special requirements or message..." />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-ink/60 bg-mist rounded-2xl px-4 py-3">
                <Users size={16} className="text-leaf shrink-0" />
                <span>{event.currentParticipants}/{event.maxParticipants} registered
                  {isFull ? <span className="ml-1 text-ember font-semibold">— Waitlist only</span>
                    : <span className="ml-1 text-leaf font-semibold">({event.maxParticipants - event.currentParticipants} spots left)</span>}
                </span>
              </div>

              <button onClick={handleJoin} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-leaf text-white py-3 px-4 rounded-full hover:bg-leaf/90 font-semibold disabled:opacity-50 shadow-soft transition-all">
                {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Registering...</>
                  : <><UserPlus size={20} />{isFull ? "Join Waitlist" : "Confirm Registration"}</>}
              </button>
            </>
          )}
          <button onClick={onClose} className="w-full text-center text-sm text-ink/60 hover:text-ink font-semibold py-1">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main EventsPage ───────────────────────────────────────────────────────────
export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);
  const [donateTarget, setDonateTarget] = useState(null);
  const [joinedIds, setJoinedIds] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem("joinedEventIds") || "[]")); }
    catch { return new Set(); }
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const loadEvents = useCallback(async (silent = false) => {
    try {
      const params = { status: "upcoming" };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const res = await eventApi.get("/api/events", { params });
      const real = res.data.events || [];
      setEvents(prev => {
        const samples = prev.filter(e => e.isSample);
        // Merge real events, preserving joined state
        return [...samples, ...real];
      });
      setLastUpdated(new Date());
    } catch {
      if (!silent) toast.error("Could not load events");
    }
  }, [search, categoryFilter]);

  // Initial load + real-time polling every 30 seconds
  useEffect(() => {
    loadEvents();
    pollRef.current = setInterval(() => loadEvents(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [loadEvents]);

  // Filter: only future events for samples, backend already filters real events
  const filtered = events.filter(e => {
    const isFuture = new Date(e.startsAt) > new Date();
    if (e.isSample && !isFuture) return false;
    if (!search && !categoryFilter) return true;
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.city?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = ["Healthcare", "Environment", "Animal Welfare", "Education", "Community Service", "Disaster Relief"];

  const handleJoinSuccess = (eventId) => {
    const next = new Set([...joinedIds, eventId]);
    setJoinedIds(next);
    sessionStorage.setItem("joinedEventIds", JSON.stringify([...next]));
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, currentParticipants: e.currentParticipants + 1 } : e));
    loadEvents(true);
  };

  const isAlreadyJoined = (event) => {
    if (joinedIds.has(event.id)) return true;
    if (!user || !event.participants) return false;
    const uid = user.id || user.sub;
    return event.participants.some(p => p.userId === uid);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-12 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Events</h1>
          <p className="mt-1 text-sm text-ink/60 flex items-center gap-2">
            Upcoming community events
            {lastUpdated && (
              <span className="flex items-center gap-1 text-xs text-ink/40">
                <Clock size={11} /> Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events or city..."
            className="rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent w-48 sm:w-56" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => loadEvents()} title="Refresh"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-ink/15 hover:bg-mist transition-all">
            <RefreshCw size={16} className="text-ink/60" />
          </button>
          <button onClick={() => user ? setShowCreateModal(true) : (toast.error("Please login"), navigate("/login"))}
            className="flex items-center gap-2 rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 shadow-soft whitespace-nowrap">
            <Plus size={18} /> Create Event
          </button>
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(event => {
          const joined = isAlreadyJoined(event);
          const isFull = event.currentParticipants >= event.maxParticipants;
          const fillPct = Math.min(100, (event.currentParticipants / event.maxParticipants) * 100);
          const daysUntil = Math.ceil((new Date(event.startsAt) - new Date()) / (1000 * 60 * 60 * 24));

          return (
            <article key={event.id} className="rounded-[1.75rem] bg-white p-5 sm:p-6 shadow-soft flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${categoryColors[event.category] || "bg-leaf/10 text-leaf"}`}>
                  {event.category}
                </span>
                <div className="flex items-center gap-1.5">
                  {daysUntil <= 3 && (
                    <span className="rounded-full bg-ember/10 px-2 py-0.5 text-xs font-semibold text-ember">
                      {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d left`}
                    </span>
                  )}
                  {event.isSample && <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-ink/40">Sample</span>}
                </div>
              </div>

              <h2 className="mt-3 font-display text-lg sm:text-xl font-bold text-ink leading-snug">{event.title}</h2>
              <p className="mt-1.5 text-sm text-ink/60 line-clamp-2 flex-1">{event.description}</p>

              <div className="mt-4 space-y-1.5 text-sm text-ink/60">
                <div className="flex items-center gap-2"><MapPin size={13} className="text-leaf shrink-0" /><span className="truncate">{event.locationName}, {event.city}</span></div>
                <div className="flex items-center gap-2"><Calendar size={13} className="text-leaf shrink-0" />
                  <span>{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    <span className="ml-1 text-ink/40">{new Date(event.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2"><Users size={13} className="text-leaf shrink-0" />
                  <span>{event.currentParticipants}/{event.maxParticipants}
                    {isFull ? <span className="ml-1 text-ember font-semibold text-xs">Full</span>
                      : <span className="ml-1 text-leaf font-semibold text-xs">{event.maxParticipants - event.currentParticipants} left</span>}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-mist overflow-hidden">
                <div className="h-full rounded-full bg-leaf transition-all duration-500" style={{ width: `${fillPct}%` }} />
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {joined ? (
                  <div className="flex-1 rounded-full bg-leaf/10 border border-leaf/20 py-2 text-center text-sm font-semibold text-leaf">
                    ✓ Registered
                  </div>
                ) : (
                  <button onClick={() => setJoinTarget(event)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-leaf text-white py-2 text-sm font-semibold hover:bg-leaf/90 shadow-soft transition-all">
                    <UserPlus size={15} />{isFull ? "Waitlist" : "Join"}
                  </button>
                )}
                <button onClick={() => { if (!user) { toast.error("Please login to donate"); navigate("/login"); return; } setDonateTarget(event); }}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-clay/10 border border-clay/20 text-clay px-3 py-2 text-sm font-semibold hover:bg-clay/20 transition-all">
                  <Heart size={15} />
                </button>
                <button onClick={() => navigate(`/events/${event.slug}`)}
                  className="flex items-center justify-center rounded-full border border-ink/15 px-3 py-2 text-sm text-ink/60 hover:bg-mist transition-all">
                  View
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center py-12">
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-ink/70 font-semibold">No upcoming events found</p>
          <p className="text-ink/40 text-sm mt-1">Try adjusting your search or create a new event</p>
        </div>
      )}

      {/* Modals */}
      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); loadEvents(); }} />
      {joinTarget && (
        <JoinEventModal
          event={joinTarget}
          alreadyJoined={isAlreadyJoined(joinTarget)}
          onClose={() => setJoinTarget(null)}
          onSuccess={() => handleJoinSuccess(joinTarget.id)}
        />
      )}
      {donateTarget && (
        <DonationModal isOpen={!!donateTarget} onClose={() => setDonateTarget(null)}
          eventId={donateTarget.id} eventTitle={donateTarget.title} isSample={donateTarget.isSample} />
      )}
    </div>
  );
}
