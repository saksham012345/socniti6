import { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";

export default function AdminDashboardPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4002/api/events/pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (slug, action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4002/api/events/${slug}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEvents(events.filter(e => e.slug !== slug));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-ink mb-6">Admin Dashboard</h1>
      <h2 className="text-xl font-semibold mb-4">Pending Events</h2>
      
      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-ink/60">No pending events.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-lg">{event.title}</h3>
              <p className="text-sm text-ink/60 mb-4">{event.organizerName}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(event.slug, "approve")}
                  className="flex items-center gap-2 rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf/90"
                >
                  <CheckCircle size={18} /> Approve
                </button>
                <button
                  onClick={() => handleAction(event.slug, "reject")}
                  className="flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember/90"
                >
                  <XCircle size={18} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
