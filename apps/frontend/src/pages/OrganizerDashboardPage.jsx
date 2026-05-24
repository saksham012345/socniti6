import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { eventApi } from "../lib/api";
import {
  Calendar, Users, Clock, Plus, ChevronRight, MapPin,
  Loader2, Edit2, Trash2, X, CheckCircle, AlertCircle,
  BarChart2, Heart, UserCheck
} from "lucide-react";
import CreateEventModal from "../components/CreateEventModal";
import toast from "react-hot-toast";

const SAMPLE_EVENTS = [
  {
    id: "s1", title: "Eye Donation Awareness Camp", slug: "eye-donation-awareness-camp-mumbai",
    category: "Healthcare", city: "Mumbai", state: "Maharashtra",
    startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    currentParticipants: 46, maxParticipants: 100, waitlistCount: 3, status: "upcoming",
    participants: [
      { userId: "u1", fullName: "Rahul Sharma", email: "rahul@example.com", joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { userId: "u2", fullName: "Priya Mehta", email: "priya@example.com", joinedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { userId: "u3", fullName: "Amit Kumar", email: "amit@example.com", joinedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: "s2", title: "Tree Plantation Drive", slug: "tree-plantation-drive-bangalore",
    category: "Environment", city: "Bangalore", state: "Karnataka",
    startsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    currentParticipants: 234, maxParticipants: 500, waitlistCount: 0, status: "upcoming",
    participants: [
      { userId: "u4", fullName: "Sneha Patel", email: "sneha@example.com", joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ]
  }
];

function ParticipantsModal({ event, onClose }) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-w-lg w-full max-h-[85vh] flex flex-col bg-white rounded-[2rem] shadow-soft">
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Participants</h2>
            <p className="text-sm text-ink/60 mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-mist">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Registered", value: event.currentParticipants, color: "text-leaf", bg: "bg-leaf/10" },
              { label: "Capacity", value: event.maxParticipants, color: "text-ink", bg: "bg-ink/10" },
              { label: "Waitlist", value: event.waitlistCount || 0, color: "text-clay", bg: "bg-clay/10" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl ${s.bg} p-3 text-center`}>
                <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-ink/50 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Fill bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>Capacity filled</span>
              <span>{Math.round((event.currentParticipants / event.maxParticipants) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-mist overflow-hidden">
              <div className="h-full rounded-full bg-leaf transition-all"
                style={{ width: `${Math.min(100, (event.currentParticipants / event.maxParticipants) * 100)}%` }} />
            </div>
          </div>

          {/* Participant list */}
          {(event.participants || []).length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/50">No participants yet.</div>
          ) : (
            (event.participants || []).map((p, i) => (
              <div key={p.userId || i} className="flex items-center gap-3 rounded-2xl border border-ink/10 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf text-white text-sm font-bold">
                  {(p.fullName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{p.fullName || "Anonymous"}</p>
                  <p className="text-xs text-ink/50 truncate">{p.email || "No email"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-ink/40">Joined</p>
                  <p className="text-xs font-semibold text-ink/60">
                    {new Date(p.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [analytics, setAnalytics] = useState({ totalEvents: 2, totalParticipants: 280, totalWaitlist: 3 });
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await eventApi.get("/api/events/dashboard");
      setEvents(res.data.events?.length > 0 ? res.data.events : SAMPLE_EVENTS);
      if (res.data.analytics) setAnalytics(res.data.analytics);
    } catch { /* keep sample */ }
    setLoading(false);
  };

  const handleDelete = async (slug) => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    try {
      await eventApi.delete(`/api/events/${slug}`);
      toast.success("Event deleted");
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startsAt) > now);
  const past = events.filter(e => new Date(e.startsAt) <= now);
  const displayed = activeTab === "upcoming" ? upcoming : past;

  const totalParticipants = events.reduce((s, e) => s + (e.currentParticipants || 0), 0);
  const totalWaitlist = events.reduce((s, e) => s + (e.waitlistCount || 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Organizer Dashboard</h1>
          <p className="text-sm text-ink/60 mt-1">Manage your events and track participants</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-full bg-clay px-5 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 shadow-soft self-start sm:self-auto">
          <Plus size={18} /> Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: events.length, icon: <Calendar size={20} />, color: "text-leaf", bg: "bg-leaf/10" },
          { label: "Upcoming", value: upcoming.length, icon: <Clock size={20} />, color: "text-clay", bg: "bg-clay/10" },
          { label: "Participants", value: totalParticipants, icon: <Users size={20} />, color: "text-ink", bg: "bg-ink/10" },
          { label: "Waitlisted", value: totalWaitlist, icon: <AlertCircle size={20} />, color: "text-ember", bg: "bg-ember/10" },
        ].map(s => (
          <div key={s.label} className="rounded-[1.75rem] bg-white p-4 shadow-soft flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.bg}`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink/50 font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Events List */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-ink">Your Events</h2>
          <div className="flex gap-1 rounded-xl bg-mist p-1">
            {["upcoming", "past"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${activeTab === t ? "bg-white text-ink shadow-sm" : "text-ink/50"}`}>
                {t} ({t === "upcoming" ? upcoming.length : past.length})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-leaf" size={28} /></div>
        ) : displayed.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-ink/50 text-sm">{activeTab === "upcoming" ? "No upcoming events." : "No past events."}</p>
            {activeTab === "upcoming" && (
              <button onClick={() => setShowCreate(true)}
                className="mt-3 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90">
                Create your first event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(event => {
              const fillPct = Math.min(100, (event.currentParticipants / event.maxParticipants) * 100);
              const daysLeft = Math.ceil((new Date(event.startsAt) - now) / (1000 * 60 * 60 * 24));
              return (
                <div key={event.id} className="rounded-2xl border border-ink/10 p-4 hover:border-ink/20 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-leaf/10 px-2.5 py-0.5 text-xs font-bold uppercase text-leaf">{event.category}</span>
                        {daysLeft > 0 && daysLeft <= 7 && (
                          <span className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-semibold text-clay">{daysLeft}d left</span>
                        )}
                        {event.status === "cancelled" && (
                          <span className="rounded-full bg-ember/10 px-2.5 py-0.5 text-xs font-semibold text-ember">Cancelled</span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-ink mt-2 leading-snug">{event.title}</h3>
                      <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
                        <MapPin size={11} />{event.city}, {event.state}
                        <span className="mx-1">·</span>
                        <Calendar size={11} />{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setSelectedEvent(event)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf/10 text-leaf hover:bg-leaf/20 transition-all" title="View participants">
                        <UserCheck size={15} />
                      </button>
                      <button onClick={() => navigate(`/events/${event.slug}`)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-ink hover:bg-ink/20 transition-all" title="View event">
                        <ChevronRight size={15} />
                      </button>
                      <button onClick={() => handleDelete(event.slug)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/10 text-ember hover:bg-ember/20 transition-all" title="Delete event">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Participant progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-ink/50 mb-1">
                      <span className="flex items-center gap-1"><Users size={11} />{event.currentParticipants} / {event.maxParticipants} participants</span>
                      {event.waitlistCount > 0 && <span className="text-clay">{event.waitlistCount} waitlisted</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                      <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>

                  {/* Participant preview */}
                  {(event.participants || []).length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {(event.participants || []).slice(0, 4).map((p, i) => (
                          <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf border-2 border-white text-white text-[10px] font-bold">
                            {(p.fullName || "?")[0].toUpperCase()}
                          </div>
                        ))}
                        {(event.participants || []).length > 4 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 border-2 border-white text-ink text-[10px] font-bold">
                            +{(event.participants || []).length - 4}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setSelectedEvent(event)}
                        className="text-xs text-leaf hover:text-leaf/80 font-semibold">
                        View all participants →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick tip */}
      <div className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <BarChart2 size={20} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Grow your impact</h3>
            <p className="text-sm text-white/70 mt-1">Share your event links to attract more volunteers. Events with detailed descriptions get 3x more registrations.</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90">
              <Plus size={14} /> Create New Event
            </button>
          </div>
        </div>
      </div>

      <CreateEventModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={loadDashboard} />
      <ParticipantsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
