import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api, { eventApi } from "../lib/api";
import {
  Calendar, Heart, Users, MapPin, ChevronRight,
  Clock, CheckCircle, AlertCircle, Loader2, Plus, Star, Ticket
} from "lucide-react";
import DonationModal from "../components/DonationModal";
import toast from "react-hot-toast";

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className={`rounded-[1.75rem] bg-white p-5 shadow-soft flex items-center gap-4`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="font-display text-3xl font-bold text-ink">{value}</p>
        <p className="text-xs font-semibold text-ink/50 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EventCard({ event, navigate, onDonate }) {
  const now = new Date();
  const start = new Date(event.startsAt);
  const daysLeft = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  const catColors = { Healthcare: "bg-ember/10 text-ember", Environment: "bg-leaf/10 text-leaf", "Animal Welfare": "bg-clay/10 text-clay" };
  const color = catColors[event.category] || "bg-ink/10 text-ink";

  return (
    <div className="rounded-[1.75rem] bg-white p-5 shadow-soft flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${color}`}>{event.category}</span>
        {daysLeft > 0 && daysLeft <= 7 && (
          <span className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-semibold text-clay flex items-center gap-1">
            <Clock size={10} /> {daysLeft}d left
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display font-bold text-ink leading-snug">{event.title}</h3>
        <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
          <MapPin size={11} />{event.city} · <Calendar size={11} />{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={() => navigate(`/events/${event.slug}`)}
          className="flex-1 rounded-full border border-ink/15 py-2 text-xs font-semibold text-ink hover:bg-mist transition-all">
          View Event
        </button>
        <button onClick={() => onDonate(event)}
          className="flex-1 rounded-full bg-clay/10 border border-clay/20 py-2 text-xs font-semibold text-clay hover:bg-clay/20 transition-all flex items-center justify-center gap-1">
          <Heart size={12} /> Donate
        </button>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [donations, setDonations] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [donateTarget, setDonateTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketRes, donationRes] = await Promise.all([
        eventApi.get("/api/tickets"),
        api.post("/graphql", {
          query: `
            query MyDonations {
              myDonations {
                id
                eventId
                amount
                item
                quantity
                type
                status
                message
                createdAt
              }
            }
          `
        })
      ]);
      setTickets(ticketRes.data.tickets || []);
      setDonations(donationRes.data.data?.myDonations || []);
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  const upcoming = joinedEvents.filter(e => new Date(e.startsAt) > new Date());
  const past = joinedEvents.filter(e => new Date(e.startsAt) <= new Date());
  const totalDonated = donations.filter(d => d.type === "monetary").reduce((s, d) => s + (d.amount || 0), 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] bg-ink px-6 sm:px-8 py-6 text-white shadow-soft">
        <p className="text-white/60 text-sm font-semibold">{greeting()},</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">{user?.fullName || "Volunteer"}</h1>
        <p className="text-white/70 text-sm mt-2">Here's your impact summary and upcoming events.</p>
        <button onClick={() => navigate("/events")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90">
          <Plus size={16} /> Find Events
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Events Joined" value={joinedEvents.length} icon={<Calendar size={22} />} color="text-leaf" bg="bg-leaf/10" />
        <StatCard label="Upcoming" value={upcoming.length} icon={<Clock size={22} />} color="text-clay" bg="bg-clay/10" />
        <StatCard label="Donations" value={donations.length} icon={<Heart size={22} />} color="text-ember" bg="bg-ember/10" />
        <StatCard label="₹ Donated" value={`₹${totalDonated}`} icon={<Star size={22} />} color="text-ink" bg="bg-ink/10" />
      </div>

      {/* Joined Events */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-ink">My Events</h2>
          <div className="flex gap-1 rounded-xl bg-mist p-1">
            {["upcoming", "past"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${activeTab === t ? "bg-white text-ink shadow-sm" : "text-ink/50"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-leaf" size={28} /></div>
        ) : (activeTab === "upcoming" ? upcoming : past).length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-ink/50 text-sm">{activeTab === "upcoming" ? "No upcoming events." : "No past events."}</p>
            <button onClick={() => navigate("/events")}
              className="mt-3 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/90">
              Browse Events
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(activeTab === "upcoming" ? upcoming : past).map(e => (
              <EventCard key={e.id} event={e} navigate={navigate} onDonate={setDonateTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Donation History */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-ink">Donation History</h2>
          <button onClick={() => navigate("/donations")}
            className="text-xs font-semibold text-leaf hover:text-leaf/80 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </button>
        </div>
        {donations.length === 0 ? (
          <p className="text-sm text-ink/50 py-6 text-center">No donations yet.</p>
        ) : (
          <div className="space-y-3">
            {donations.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10">
                    <Heart size={18} className="text-ember" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">Event #{String(d.eventId).slice(0, 8)}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {d.type === "monetary" ? `₹${d.amount}` : `${d.quantity}x ${d.item}`}
                      {" · "}{new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-0.5 text-xs font-semibold text-leaf">
                  <CheckCircle size={11} /> Done
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="font-display text-xl font-bold text-ink mb-4">Support Tickets</h2>
        {tickets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-ink/50 mb-4">You don't have any support tickets yet.</p>
            <button onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/90">
              <Ticket size={16} /> Raise a Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const statusColors = {
                open: "bg-blue-100 text-blue-800",
                "in-progress": "bg-yellow-100 text-yellow-800",
                waiting: "bg-gray-100 text-gray-800",
                resolved: "bg-green-100 text-green-800",
                closed: "bg-gray-100 text-gray-800"
              };
              const priorityColors = {
                low: "text-blue-600",
                medium: "text-yellow-600",
                high: "text-orange-600",
                urgent: "text-red-600"
              };
              return (
                <div key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-3 hover:bg-gray-50 cursor-pointer transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/10">
                      <Ticket size={18} className="text-ink" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{ticket.subject}</p>
                      <p className="text-xs text-ink/50 mt-0.5">
                        {ticket.id.slice(0, 8)} · Priority: <span className={`font-semibold ${priorityColors[ticket.priority]}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[ticket.status]}`}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="font-display text-xl font-bold text-ink mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Browse Events", icon: <Calendar size={20} />, color: "bg-leaf/10 text-leaf", action: () => navigate("/events") },
            { label: "Make Donation", icon: <Heart size={20} />, color: "bg-ember/10 text-ember", action: () => navigate("/donations") },
            { label: "My Profile", icon: <Users size={20} />, color: "bg-clay/10 text-clay", action: () => navigate("/profile") },
            { label: "Contact Us", icon: <AlertCircle size={20} />, color: "bg-ink/10 text-ink", action: () => navigate("/contact") },
          ].map(q => (
            <button key={q.label} onClick={q.action}
              className="flex flex-col items-center gap-2 rounded-2xl border border-ink/10 p-4 hover:bg-mist transition-all">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${q.color}`}>{q.icon}</span>
              <span className="text-xs font-semibold text-ink text-center">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {donateTarget && (
        <DonationModal isOpen={!!donateTarget} onClose={() => setDonateTarget(null)}
          eventId={donateTarget.id} eventTitle={donateTarget.title} paymentQr={donateTarget.paymentQr} />
      )}
    </div>
  );
}
