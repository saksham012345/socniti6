import { ArrowRight, MapPinned, ShieldCheck, Sparkles, HelpCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const highlights = [
  {
    title: "Find events near you",
    text: "Discover social impact events within your city and eventually within a 20km radius."
  },
  {
    title: "Volunteer with trust",
    text: "Organizer profiles, role-based access, and secure auth keep the community safer."
  },
  {
    title: "Coordinate in real time",
    text: "SOCNITI is designed for live updates, attendee chats, and timely reminders."
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "medium"
  });
  const [loading, setLoading] = useState(false);

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to raise a ticket");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4002/api/tickets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority
        })
      });

      if (res.ok) {
        toast.success("Ticket created! Our team will assist you soon.");
        setShowTicketModal(false);
        setTicketForm({ subject: "", description: "", priority: "medium" });
        navigate("/dashboard");
      } else {
        toast.error("Failed to create ticket");
      }
    } catch (err) {
      toast.error("Error creating ticket");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-12 pb-24 md:pb-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-ink px-6 sm:px-8 py-8 sm:py-10 text-white shadow-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            <Sparkles size={16} />
            Build local impact together
          </span>
          <h1 className="mt-5 font-display text-3xl sm:text-5xl font-extrabold leading-tight">
            Discover nearby causes, join NGO events, and turn intention into action.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80">
            SOCNITI connects volunteers, organizers, and donors through location-aware event
            discovery, community participation, and transparent coordination.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/events"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-3 font-semibold text-white">
              Explore events <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white">
              Join SOCNITI
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-1">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3 text-leaf">
              <MapPinned />
              <h2 className="font-display text-lg sm:text-xl font-bold text-ink">Location-first discovery</h2>
            </div>
            <p className="mt-3 text-sm sm:text-base text-ink/70">
              Event cards, map-ready data, distance sorting, and route integration are baked into
              the platform design from the start.
            </p>
          </div>
          <div className="rounded-[2rem] bg-clay p-6 text-white shadow-soft">
            <div className="flex items-center gap-3">
              <ShieldCheck />
              <h2 className="font-display text-lg sm:text-xl font-bold">Built with trust in mind</h2>
            </div>
            <p className="mt-3 text-sm sm:text-base text-white/80">
              JWT auth, OTP support, role-based permissions, and organizer verification fit the
              mission-critical parts of the product.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 sm:mt-12 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        {highlights.map((highlight) => (
          <article key={highlight.title} className="rounded-[1.75rem] bg-white p-5 sm:p-6 shadow-soft">
            <h3 className="font-display text-lg sm:text-xl font-bold text-ink">{highlight.title}</h3>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-ink/70">{highlight.text}</p>
          </article>
        ))}
      </section>

      {/* Help Button */}
      {user && (
        <button
          onClick={() => setShowTicketModal(true)}
          className="fixed bottom-8 right-8 inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-semibold text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <HelpCircle size={20} />
          Need Help?
        </button>
      )}

      {/* Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-[2rem] bg-white p-8 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-ink mb-4">Raise a Support Ticket</h2>
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Description</label>
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Provide more details about your issue"
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Priority</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-leaf focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-ink font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-leaf text-white rounded-xl font-semibold hover:bg-leaf/90 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
