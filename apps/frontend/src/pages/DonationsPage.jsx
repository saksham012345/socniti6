import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { eventApi } from "../lib/api";
import {
  Heart, DollarSign, Package, Calendar, MapPin,
  ChevronRight, Loader2, Plus, TrendingUp, Users, Star
} from "lucide-react";
import DonationModal from "../components/DonationModal";

const SAMPLE_EVENTS = [
  { id: "s1", title: "Eye Donation Awareness Camp", category: "Healthcare", city: "Mumbai", startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), currentParticipants: 46, maxParticipants: 100, slug: "eye-donation-awareness-camp-mumbai", isSample: true, donationNeeds: [{ item: "Eye drops", quantity: 50, fulfilled: 20 }, { item: "Pamphlets", quantity: 200, fulfilled: 150 }] },
  { id: "s2", title: "Free Medical Health Camp", category: "Healthcare", city: "Delhi", startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), currentParticipants: 120, maxParticipants: 200, slug: "free-medical-camp-delhi", isSample: true, donationNeeds: [{ item: "Medical Kits", quantity: 100, fulfilled: 45 }, { item: "Medicines", quantity: 500, fulfilled: 200 }] },
  { id: "s3", title: "Tree Plantation Drive", category: "Environment", city: "Bangalore", startsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), currentParticipants: 234, maxParticipants: 500, slug: "tree-plantation-drive-bangalore", isSample: true, donationNeeds: [{ item: "Saplings", quantity: 1000, fulfilled: 600 }, { item: "Fertilizer bags", quantity: 50, fulfilled: 10 }] },
  { id: "s4", title: "Blood Donation Camp", category: "Healthcare", city: "Pune", startsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), currentParticipants: 67, maxParticipants: 100, slug: "blood-donation-camp-pune", isSample: true, donationNeeds: [] },
];

const SAMPLE_MY_DONATIONS = [
  { id: "d1", eventTitle: "Blood Donation Camp", eventSlug: "blood-donation-camp-pune", type: "monetary", amount: 500, status: "completed", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), message: "Happy to support!" },
  { id: "d2", eventTitle: "Free Medical Camp", eventSlug: "free-medical-camp-delhi", type: "item", item: "Medical Kits", quantity: 5, status: "completed", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
];

const catColors = {
  Healthcare: "bg-ember/10 text-ember",
  Environment: "bg-leaf/10 text-leaf",
  "Animal Welfare": "bg-clay/10 text-clay",
  default: "bg-ink/10 text-ink"
};

function NeedBar({ item, quantity, fulfilled }) {
  const pct = Math.min(100, Math.round((fulfilled / quantity) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-ink">{item}</span>
        <span className="text-ink/50">{fulfilled}/{quantity}</span>
      </div>
      <div className="h-1.5 rounded-full bg-mist overflow-hidden">
        <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DonationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [myDonations, setMyDonations] = useState(SAMPLE_MY_DONATIONS);
  const [loading, setLoading] = useState(false);
  const [donateTarget, setDonateTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("give");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await eventApi.get("/api/events");
      const upcoming = (res.data.events || []).filter(e => new Date(e.startsAt) > new Date());
      if (upcoming.length > 0) setEvents(upcoming);
    } catch { /* keep sample */ }
    setLoading(false);
  };

  const totalMonetary = myDonations.filter(d => d.type === "monetary").reduce((s, d) => s + (d.amount || 0), 0);
  const totalItems = myDonations.filter(d => d.type === "item").reduce((s, d) => s + (d.quantity || 0), 0);

  const filtered = events.filter(e =>
    !categoryFilter || e.category === categoryFilter
  );

  const categories = [...new Set(events.map(e => e.category))];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] bg-ink px-6 sm:px-8 py-6 text-white shadow-soft">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Donations</h1>
        <p className="text-white/70 text-sm mt-2">Support events with money or items. Every contribution makes a difference.</p>
      </div>

      {/* My Impact Stats (only when logged in) */}
      {user && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Donated", value: `₹${totalMonetary}`, icon: <DollarSign size={18} />, color: "text-leaf", bg: "bg-leaf/10" },
            { label: "Items Given", value: totalItems, icon: <Package size={18} />, color: "text-clay", bg: "bg-clay/10" },
            { label: "Events Supported", value: myDonations.length, icon: <Heart size={18} />, color: "text-ember", bg: "bg-ember/10" },
          ].map(s => (
            <div key={s.label} className="rounded-[1.75rem] bg-white p-4 shadow-soft text-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} mx-auto mb-2`}>
                <span className={s.color}>{s.icon}</span>
              </div>
              <p className={`font-display text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-ink/50 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-white p-1.5 shadow-soft">
        {[
          { key: "give", label: "Give to Events" },
          { key: "history", label: "My Donations" },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${activeTab === t.key ? "bg-ink text-white shadow-soft" : "text-ink/60 hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Give Tab */}
      {activeTab === "give" && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setCategoryFilter("")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${!categoryFilter ? "bg-ink text-white" : "bg-white text-ink/60 border border-ink/15 hover:border-ink/30"}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${categoryFilter === c ? "bg-ink text-white" : "bg-white text-ink/60 border border-ink/15 hover:border-ink/30"}`}>
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-leaf" size={28} /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-10 shadow-soft text-center">
              <p className="text-ink/50">No events found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map(event => {
                const color = catColors[event.category] || catColors.default;
                const hasNeeds = (event.donationNeeds || []).length > 0;
                return (
                  <div key={event.id} className="rounded-[1.75rem] bg-white p-5 shadow-soft flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${color}`}>{event.category}</span>
                      <span className="text-xs text-ink/40 flex items-center gap-1">
                        <Calendar size={11} />{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-ink leading-snug">{event.title}</h3>
                      <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
                        <MapPin size={11} />{event.city}
                        <span className="mx-1">·</span>
                        <Users size={11} />{event.currentParticipants}/{event.maxParticipants}
                      </p>
                    </div>

                    {/* Donation needs */}
                    {hasNeeds && (
                      <div className="rounded-2xl bg-mist p-3 space-y-2">
                        <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Items Needed</p>
                        {(event.donationNeeds || []).map((n, i) => (
                          <NeedBar key={i} item={n.item} quantity={n.quantity} fulfilled={n.fulfilled || 0} />
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => {
                        if (!user) { navigate("/login"); return; }
                        setDonateTarget(event);
                      }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-clay text-white py-2.5 text-sm font-semibold hover:bg-clay/90 shadow-soft transition-all">
                        <Heart size={15} /> Donate
                      </button>
                      <button onClick={() => navigate(`/events/${event.slug}`)}
                        className="flex items-center justify-center rounded-full border border-ink/15 px-3 py-2.5 text-sm text-ink/70 hover:bg-mist transition-all">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          {!user ? (
            <div className="py-12 text-center">
              <p className="text-ink/50 text-sm">Please login to see your donation history.</p>
              <button onClick={() => navigate("/login")}
                className="mt-3 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/90">
                Login
              </button>
            </div>
          ) : myDonations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-ink/50 text-sm">You haven't made any donations yet.</p>
              <button onClick={() => setActiveTab("give")}
                className="mt-3 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90">
                Make your first donation
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myDonations.map(d => (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-ink/10 p-4 hover:border-ink/20 transition-all">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${d.type === "monetary" ? "bg-leaf/10" : "bg-clay/10"}`}>
                    {d.type === "monetary"
                      ? <DollarSign size={20} className="text-leaf" />
                      : <Package size={20} className="text-clay" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{d.eventTitle}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {d.type === "monetary" ? `₹${d.amount}` : `${d.quantity}x ${d.item}`}
                      {d.message && ` · "${d.message}"`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="rounded-full bg-leaf/10 px-2.5 py-0.5 text-xs font-semibold text-leaf block">Done</span>
                    <p className="text-xs text-ink/40 mt-1">
                      {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-4 rounded-2xl bg-mist p-4 flex items-center gap-3">
                <TrendingUp size={20} className="text-leaf shrink-0" />
                <p className="text-sm text-ink/70">
                  You've donated <span className="font-bold text-ink">₹{totalMonetary}</span> and <span className="font-bold text-ink">{totalItems} items</span> across {myDonations.length} events. Thank you for your impact!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {donateTarget && (
        <DonationModal isOpen={!!donateTarget} onClose={() => setDonateTarget(null)}
          eventId={donateTarget.id} eventTitle={donateTarget.title} isSample={donateTarget.isSample} />
      )}
    </div>
  );
}
