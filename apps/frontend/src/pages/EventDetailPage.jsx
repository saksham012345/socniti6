import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { eventApi } from "../lib/api";
import toast from "react-hot-toast";
import {
  MapPin, Calendar, Users, ArrowLeft, UserPlus, Heart, MessageCircle,
  Loader2, CheckCircle, RefreshCw, Clock, Phone, Mail, FileText, X
} from "lucide-react";
import DonationModal from "../components/DonationModal";
import EventChat from "../components/EventChat";

const SAMPLE_EVENTS = {
  "eye-donation-awareness-camp-mumbai": { id: "sample-1", title: "Eye Donation Awareness Camp", description: "Join us for an eye donation awareness camp. Learn about the importance of eye donation and pledge to donate your eyes. Free eye checkup available for all attendees. Doctors from leading hospitals will be present to answer your questions about eye donation.", category: "Healthcare", locationName: "Lions Club Community Center", city: "Mumbai", state: "Maharashtra", startsAt: (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString(); })(), currentParticipants: 45, maxParticipants: 100, slug: "eye-donation-awareness-camp-mumbai", isSample: true, organizer: { fullName: "Dr. Priya Sharma", username: "drpriya" } },
  "beach-cleanup-drive-juhu": { id: "sample-2", title: "Juhu Beach Cleanup Drive", description: "Help us clean Juhu Beach and make it plastic-free. Bring your friends and family for a morning of community service. Gloves, bags, and refreshments will be provided.", category: "Environment", locationName: "Juhu Beach", city: "Mumbai", state: "Maharashtra", startsAt: (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString(); })(), currentParticipants: 78, maxParticipants: 150, slug: "beach-cleanup-drive-juhu", isSample: true, organizer: { fullName: "Rahul Mehta", username: "rahulmehta" } },
  "free-medical-camp-delhi": {
    id: "sample-3", title: "Free Medical Health Camp",
    description: "Free health checkup for underprivileged communities. General screening, blood pressure, diabetes testing, and doctor consultations available. Medicines will be distributed free of cost.",
    category: "Healthcare", locationName: "Government School Ground", city: "Delhi", state: "Delhi",
    startsAt: (() => { const d = new Date(); d.setDate(d.getDate() + 8); return d.toISOString(); })(), currentParticipants: 120, maxParticipants: 200,
    slug: "free-medical-camp-delhi", isSample: true,
    organizer: { fullName: "Dr. Amit Kumar", username: "dramit" }
  },
  "tree-plantation-drive-bangalore": {
    id: "sample-4", title: "Tree Plantation Drive",
    description: "Plant 1000 trees in one day! Join our mission to make Bangalore greener. Saplings and tools will be provided. Refreshments included. Certificate of participation for all volunteers.",
    category: "Environment", locationName: "Cubbon Park", city: "Bangalore", state: "Karnataka",
    startsAt: "2026-04-25T06:30:00Z", currentParticipants: 234, maxParticipants: 500,
    slug: "tree-plantation-drive-bangalore", isSample: true,
    organizer: { fullName: "Green Bangalore NGO", username: "greenbangalore" }
  },
  "blood-donation-camp-pune": {
    id: "sample-5", title: "Blood Donation Camp",
    description: "Donate blood, save lives. Organized by Indian Red Cross Society. All blood groups needed. Certificate of appreciation provided. Light refreshments after donation.",
    category: "Healthcare", locationName: "City Hospital", city: "Pune", state: "Maharashtra",
    startsAt: "2026-04-22T08:00:00Z", currentParticipants: 67, maxParticipants: 100,
    slug: "blood-donation-camp-pune", isSample: true,
    organizer: { fullName: "Red Cross Pune", username: "redcrosspune" }
  },
  "street-dog-vaccination-noida": {
    id: "sample-6", title: "Street Dog Vaccination Drive",
    description: "Help vaccinate street dogs against rabies. Veterinary team present. Volunteers needed for handling and documentation. Together we can make our streets safer for both humans and animals.",
    category: "Animal Welfare", locationName: "Sector 15 Market", city: "Noida", state: "Uttar Pradesh",
    startsAt: "2026-04-28T07:00:00Z", currentParticipants: 23, maxParticipants: 50,
    slug: "street-dog-vaccination-noida", isSample: true,
    organizer: { fullName: "Animal Care Society", username: "animalcare" }
  }
};

export default function EventDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  const loadEvent = async () => {
    setLoading(true);
    // Check sample events first
    if (SAMPLE_EVENTS[slug]) {
      const base = SAMPLE_EVENTS[slug];
      // Restore local registration state from sessionStorage
      const stored = sessionStorage.getItem(`registered_${slug}`);
      if (stored === "true") {
        setIsRegistered(true);
        setEvent({ ...base, currentParticipants: base.currentParticipants + 1 });
      } else {
        setEvent(base);
      }
      setLoading(false);
      return;
    }
    try {
      const res = await eventApi.get(`/api/events/${slug}`);
      const ev = res.data.event;
      setEvent(ev);
      // Check registration: backend stores userId as string, user.id may differ from user.sub
      if (user) {
        const userId = user.id || user.sub;
        const registered = ev.participants?.some(
          p => p.userId === userId || p.userId === user.id || p.userId === user.sub
        );
        setIsRegistered(!!registered);
      }
    } catch {
      toast.error("Event not found");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) { toast.error("Please login to register"); navigate("/login"); return; }
    if (event.isSample) {
      // Update count locally and persist to sessionStorage
      setEvent(prev => ({ ...prev, currentParticipants: prev.currentParticipants + 1 }));
      setIsRegistered(true);
      sessionStorage.setItem(`registered_${slug}`, "true");
      toast.success("Registered successfully!");
      return;
    }
    setRegistering(true);
    try {
      const res = await eventApi.post(`/api/events/${slug}/register`, {
        fullName: user.fullName, email: user.email
      });
      toast.success(res.data.message || "Registered successfully!");
      setIsRegistered(true);
      // Update count from the returned event data
      if (res.data.event) {
        setEvent(res.data.event);
      } else {
        setEvent(prev => ({ ...prev, currentParticipants: prev.currentParticipants + 1 }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (event.isSample) {
      setEvent(prev => ({ ...prev, currentParticipants: Math.max(0, prev.currentParticipants - 1) }));
      setIsRegistered(false);
      sessionStorage.removeItem(`registered_${slug}`);
      toast.success("Registration cancelled");
      return;
    }
    try {
      const res = await eventApi.post(`/api/events/${slug}/cancel`);
      toast.success("Registration cancelled");
      setIsRegistered(false);
      if (res.data.event) {
        setEvent(res.data.event);
      } else {
        setEvent(prev => ({ ...prev, currentParticipants: Math.max(0, prev.currentParticipants - 1) }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-leaf" />
    </div>
  );
  if (!event) return null;

  const isFull = event.currentParticipants >= event.maxParticipants;
  const spotsLeft = event.maxParticipants - event.currentParticipants;
  const fillPct = Math.min(100, (event.currentParticipants / event.maxParticipants) * 100);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <button onClick={() => navigate("/events")}
        className="flex items-center gap-2 text-ink/60 hover:text-ink mb-8 font-semibold text-sm transition-colors">
        <ArrowLeft size={18} /> Back to Events
      </button>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        {/* Main */}
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-8 shadow-soft">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-bold uppercase text-leaf">{event.category}</span>
              {event.isSample && <span className="rounded-full bg-mist px-2 py-0.5 text-xs text-ink/50">Sample Event</span>}
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${isFull ? "bg-ember/10 text-ember" : "bg-leaf/10 text-leaf"}`}>
                {isFull ? "Full" : `${spotsLeft} spots left`}
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold text-ink leading-tight">{event.title}</h1>
            <p className="mt-4 text-ink/70 leading-relaxed">{event.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf/10"><MapPin className="h-5 w-5 text-leaf" /></div>
                <div><p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Location</p><p className="text-sm font-semibold text-ink mt-0.5">{event.locationName}</p><p className="text-xs text-ink/60">{event.city}, {event.state}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay/10"><Calendar className="h-5 w-5 text-clay" /></div>
                <div><p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Date & Time</p><p className="text-sm font-semibold text-ink mt-0.5">{new Date(event.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-xs text-ink/60">{new Date(event.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/10"><Users className="h-5 w-5 text-ink" /></div>
                <div><p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Participants</p><p className="text-sm font-semibold text-ink mt-0.5">{event.currentParticipants} / {event.maxParticipants}</p>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-mist overflow-hidden"><div className="h-full rounded-full bg-leaf" style={{ width: `${fillPct}%` }} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat */}
          {user && isRegistered && (
            <div className="rounded-[2rem] bg-white p-8 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-ink">Event Chat</h2>
                <button onClick={() => setShowChat(!showChat)}
                  className="flex items-center gap-2 text-sm text-leaf hover:text-leaf/80 font-semibold">
                  <MessageCircle size={18} />{showChat ? "Hide" : "Open Chat"}
                </button>
              </div>
              {showChat && !event.isSample && <EventChat eventId={event.id} />}
              {showChat && event.isSample && (
                <div className="rounded-2xl bg-mist p-6 text-center text-sm text-ink/60">
                  Chat is available for real events. This is a sample event.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft space-y-3">
            {isRegistered ? (
              <>
                <div className="flex items-center gap-2 rounded-2xl bg-leaf/10 border border-leaf/20 px-4 py-3">
                  <CheckCircle size={18} className="text-leaf" />
                  <p className="text-sm font-semibold text-leaf">You're registered!</p>
                </div>
                <button onClick={handleCancelRegistration}
                  className="w-full rounded-full border border-ember/20 bg-ember/10 py-2.5 text-sm font-semibold text-ember hover:bg-ember/20 transition-all">
                  Cancel Registration
                </button>
              </>
            ) : (
              <button onClick={handleRegister} disabled={registering}
                className="w-full flex items-center justify-center gap-2 bg-leaf text-white py-3 px-4 rounded-full hover:bg-leaf/90 font-semibold disabled:opacity-50 shadow-soft transition-all">
                {registering ? <><Loader2 className="h-5 w-5 animate-spin" />Registering...</> : <><UserPlus size={20} />{isFull ? "Join Waitlist" : "Register for Event"}</>}
              </button>
            )}
            <button onClick={() => { if (!user) { toast.error("Please login to donate"); navigate("/login"); return; } setShowDonationModal(true); }}
              className="w-full flex items-center justify-center gap-2 bg-clay text-white py-3 px-4 rounded-full hover:bg-clay/90 font-semibold shadow-soft transition-all">
              <Heart size={20} /> Donate to this Event
            </button>
            {event.paymentQr && (
              <div className="mt-3">
                <p className="text-xs text-ink/50">Payment QR / Link</p>
                <div className="mt-2 flex items-center gap-2">
                  <input value={event.paymentQr} readOnly className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm bg-gray-50" />
                  <button onClick={()=>{ navigator.clipboard.writeText(event.paymentQr); toast.success('Copied payment link'); }} className="rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-white">Copy</button>
                </div>
              </div>
            )}
          </div>

          {event.donationNeeds && event.donationNeeds.length > 0 && (
            <div className="rounded-[2rem] bg-white p-6 shadow-soft">
              <h3 className="text-sm font-semibold text-ink mb-3">Needed items</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                {event.donationNeeds.map((it, idx) => (
                  <li key={idx} className="flex justify-between"><span>{it.item}</span><span className="font-semibold">{it.quantity} needed</span></li>
                ))}
              </ul>
            </div>
          )}

          {event.organizer && (
            <div className="rounded-[2rem] bg-white p-6 shadow-soft">
              <h3 className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">Organized by</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-white font-bold text-lg">
                  {event.organizer.fullName?.[0] || "O"}
                </div>
                <div>
                  <p className="font-semibold text-ink">{event.organizer.fullName}</p>
                  <p className="text-sm text-ink/60">@{event.organizer.username}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[2rem] bg-ink p-6 text-white">
            <h3 className="font-display font-bold text-lg mb-2">Share this Event</h3>
            <p className="text-sm text-white/70 mb-4">Help spread the word and get more volunteers!</p>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
              className="w-full rounded-full bg-white/10 hover:bg-white/20 py-2.5 text-sm font-semibold transition-all">
              Copy Event Link
            </button>
          </div>
        </div>
      </div>

      <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)}
        eventId={event.id} eventTitle={event.title} isSample={event.isSample} />
    </div>
  );
}
