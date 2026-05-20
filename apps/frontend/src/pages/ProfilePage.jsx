import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Shield, Camera, Edit2, Save, X, LogOut,
  MapPin, Phone, Calendar, Users, Heart, Star, Plus,
  ChevronRight, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { eventApi } from "../lib/api";
import CreateEventModal from "../components/CreateEventModal";

const TABS = ["Overview", "Joined", "Hosted", "Donated"];

// Sample activity data for demo
const SAMPLE_JOINED = [
  { id: "s1", title: "Eye Donation Awareness Camp", city: "Mumbai", category: "Healthcare", startsAt: "2026-04-15T10:00:00Z", status: "upcoming" },
  { id: "s2", title: "Juhu Beach Cleanup Drive", city: "Mumbai", category: "Environment", startsAt: "2026-04-20T07:00:00Z", status: "upcoming" },
];
const SAMPLE_DONATED = [
  { id: "d1", eventTitle: "Blood Donation Camp", type: "monetary", amount: 500, createdAt: "2026-04-10T10:00:00Z" },
  { id: "d2", eventTitle: "Free Medical Camp", type: "item", item: "Medical Kits", quantity: 5, createdAt: "2026-04-08T10:00:00Z" },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hostedEvents, setHostedEvents] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState(SAMPLE_JOINED);
  const [donations, setDonations] = useState(SAMPLE_DONATED);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    phone: user?.phone || ""
  });

  useEffect(() => {
    if (user) loadActivity();
  }, [user]);

  const loadActivity = async () => {
    setLoading(true);
    try {
      // Load hosted events
      const res = await eventApi.get("/api/events/dashboard");
      setHostedEvents(res.data.events || []);
    } catch {
      // Keep sample data on failure
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    toast.success("Profile updated!");
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initials = user?.fullName
    ?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "U";

  const stats = [
    { label: "Events Joined", value: joinedEvents.length, color: "text-leaf", bg: "bg-leaf/10" },
    { label: "Events Hosted", value: hostedEvents.length, color: "text-clay", bg: "bg-clay/10" },
    { label: "Donations Made", value: donations.length, color: "text-ember", bg: "bg-ember/10" },
    { label: "Impact Score", value: joinedEvents.length + hostedEvents.length * 3 + donations.length * 2, color: "text-ink", bg: "bg-ink/10" },
  ];

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-leaf" />
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-12 pb-24 md:pb-12">

      {/* Profile Header Card */}
      <div className="rounded-[2rem] bg-white shadow-soft overflow-hidden">
        {/* Cover */}
        <div className="h-24 sm:h-32 bg-gradient-to-r from-ink to-leaf" />

        <div className="px-6 pb-6">
          {/* Avatar + Actions row */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-4">
            <div className="relative">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-leaf text-2xl sm:text-3xl font-bold text-white border-4 border-white shadow-soft">
                {initials}
              </div>
              <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-clay text-white shadow-soft hover:bg-clay/90">
                <Camera size={14} />
              </button>
            </div>

            <div className="flex gap-2 mt-14 sm:mt-16">
              {!isEditing ? (
                <>
                  <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 rounded-full bg-clay px-3 py-2 text-xs font-semibold text-white hover:bg-clay/90 shadow-soft">
                    <Plus size={14} /> Host Event
                  </button>
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink/90">
                    <Edit2 size={14} /> Edit
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1.5 rounded-full border border-ink/20 px-3 py-2 text-xs font-semibold text-ink hover:bg-mist">
                    <X size={14} /> Cancel
                  </button>
                  <button onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-full bg-leaf px-3 py-2 text-xs font-semibold text-white hover:bg-leaf/90">
                    <Save size={14} /> Save
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + role */}
          <div>
            {isEditing ? (
              <input type="text" name="fullName" value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="font-display text-2xl font-bold text-ink border-b-2 border-leaf bg-transparent outline-none w-full" />
            ) : (
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">{user.fullName}</h1>
            )}
            <p className="text-sm text-ink/60 mt-0.5">@{user.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf">
                <Shield size={12} /> {user.role}
              </span>
              {user.email && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs text-ink/60">
                  <Mail size={12} /> {user.email}
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mt-4">
            {isEditing ? (
              <textarea name="bio" value={formData.bio} rows={3}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="Tell the community about yourself..." />
            ) : (
              <p className="text-sm text-ink/70 leading-relaxed">
                {formData.bio || "No bio yet. Click Edit to add one."}
              </p>
            )}
          </div>

          {/* Location + Phone */}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink/60">
            {isEditing ? (
              <>
                <input type="text" name="location" value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="rounded-xl border border-ink/15 px-3 py-1.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                  placeholder="City, Country" />
                <input type="tel" name="phone" value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-xl border border-ink/15 px-3 py-1.5 text-sm focus:ring-2 focus:ring-leaf focus:border-transparent"
                  placeholder="+91 98765 43210" />
              </>
            ) : (
              <>
                {formData.location && (
                  <span className="flex items-center gap-1"><MapPin size={14} className="text-leaf" />{formData.location}</span>
                )}
                {formData.phone && (
                  <span className="flex items-center gap-1"><Phone size={14} className="text-leaf" />{formData.phone}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-[1.5rem] bg-white p-4 shadow-soft text-center">
            <p className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-ink/60 mt-1 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-2xl bg-white p-1.5 shadow-soft overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-max rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === tab ? "bg-ink text-white shadow-soft" : "text-ink/60 hover:text-ink"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "Overview" && <OverviewTab user={user} formData={formData} isEditing={isEditing} setFormData={setFormData} handleLogout={handleLogout} joinedEvents={joinedEvents} hostedEvents={hostedEvents} donations={donations} navigate={navigate} />}
        {activeTab === "Joined" && <EventListTab events={joinedEvents} emptyMsg="You haven't joined any events yet." navigate={navigate} type="joined" />}
        {activeTab === "Hosted" && <EventListTab events={hostedEvents} emptyMsg="You haven't hosted any events yet." navigate={navigate} type="hosted" onCreateClick={() => setShowCreateModal(true)} />}
        {activeTab === "Donated" && <DonationsTab donations={donations} />}
      </div>

      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); loadActivity(); }} />
    </div>
  );
}

function OverviewTab({ user, formData, isEditing, setFormData, handleLogout, joinedEvents, hostedEvents, donations, navigate }) {
  return (
    <div className="space-y-4">
      {/* Recent Joined */}
      {joinedEvents.length > 0 && (
        <SectionCard title="Recently Joined" icon={<Users size={18} className="text-leaf" />}>
          {joinedEvents.slice(0, 2).map(e => (
            <EventRow key={e.id} event={e} navigate={navigate} />
          ))}
        </SectionCard>
      )}

      {/* Recent Hosted */}
      {hostedEvents.length > 0 && (
        <SectionCard title="Events Hosted" icon={<Star size={18} className="text-clay" />}>
          {hostedEvents.slice(0, 2).map(e => (
            <EventRow key={e.id} event={e} navigate={navigate} />
          ))}
        </SectionCard>
      )}

      {/* Recent Donations */}
      {donations.length > 0 && (
        <SectionCard title="Recent Donations" icon={<Heart size={18} className="text-ember" />}>
          {donations.slice(0, 2).map(d => (
            <DonationRow key={d.id} donation={d} />
          ))}
        </SectionCard>
      )}

      {/* Logout */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <button onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-ember/20 bg-ember/10 px-4 py-2.5 text-sm font-semibold text-ember hover:bg-ember/20 transition-all">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

function EventListTab({ events, emptyMsg, navigate, type, onCreateClick }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
      {type === "hosted" && (
        <button onClick={onCreateClick}
          className="mb-4 flex items-center gap-2 rounded-full bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 shadow-soft">
          <Plus size={16} /> Host a New Event
        </button>
      )}
      {events.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-ink/50 text-sm">{emptyMsg}</p>
          {type === "joined" && (
            <button onClick={() => navigate("/events")}
              className="mt-4 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/90">
              Browse Events
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(e => <EventRow key={e.id} event={e} navigate={navigate} full />)}
        </div>
      )}
    </div>
  );
}

function DonationsTab({ donations }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
      {donations.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-ink/50 text-sm">No donations yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map(d => <DonationRow key={d.id} donation={d} full />)}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-display font-bold text-ink">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EventRow({ event, navigate, full }) {
  const catColors = {
    Healthcare: "bg-ember/10 text-ember", Environment: "bg-leaf/10 text-leaf",
    "Animal Welfare": "bg-clay/10 text-clay", default: "bg-ink/10 text-ink"
  };
  const color = catColors[event.category] || catColors.default;
  return (
    <div onClick={() => navigate(`/events/${event.slug}`)}
      className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-3 hover:bg-mist cursor-pointer transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${color}`}>
          {event.category?.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{event.title}</p>
          <p className="text-xs text-ink/50 flex items-center gap-1 mt-0.5">
            <MapPin size={10} />{event.city}
            <span className="mx-1">·</span>
            <Calendar size={10} />{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
      <ChevronRight size={16} className="text-ink/30 shrink-0" />
    </div>
  );
}

function DonationRow({ donation, full }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
          <Heart size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{donation.eventTitle}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {donation.type === "monetary" ? `₹${donation.amount}` : `${donation.quantity}x ${donation.item}`}
            <span className="mx-1">·</span>
            {new Date(donation.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${donation.type === "monetary" ? "bg-leaf/10 text-leaf" : "bg-clay/10 text-clay"}`}>
        {donation.type === "monetary" ? "Money" : "Item"}
      </span>
    </div>
  );
}
