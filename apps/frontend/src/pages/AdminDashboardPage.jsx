import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  Settings,
  ShieldCheck,
  Ticket,
  XCircle,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";
import { eventApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "verification", label: "Event Verification", icon: Zap },
  { id: "donations", label: "Donation Management", icon: DollarSign },
  { id: "tickets", label: "Support Tickets", icon: Ticket },
  { id: "settings", label: "Settings", icon: Settings }
];

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  waiting: "bg-gray-100 text-gray-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  pending: "bg-gray-100 text-ink",
  partial: "bg-clay/10 text-clay",
  settled: "bg-leaf/10 text-leaf"
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

function StatCard({ label, value, icon: Icon, tone = "text-ink" }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-ink/50">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mist text-ink">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function SettlementRow({ settlement, onSettle }) {
  const [amount, setAmount] = useState(settlement.settledAmount || 0);
  const [notes, setNotes] = useState(settlement.notes || "");
  const disabled = settlement.pendingAmount <= 0;

  useEffect(() => {
    setAmount(settlement.settledAmount || 0);
    setNotes(settlement.notes || "");
  }, [settlement]);

  return (
    <tr className="align-top hover:bg-gray-50">
      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-ink">Event #{String(settlement.eventId).slice(0, 8)}</p>
        <p className="mt-1 text-xs text-ink/50">Updated {new Date(settlement.updatedAt || settlement.createdAt).toLocaleDateString("en-IN")}</p>
      </td>
      <td className="px-5 py-4 text-sm text-ink">{currency.format(settlement.totalAmount)}</td>
      <td className="px-5 py-4 text-sm font-semibold text-leaf">{currency.format(settlement.settledAmount)}</td>
      <td className="px-5 py-4 text-sm font-semibold text-clay">{currency.format(Math.max(0, settlement.pendingAmount))}</td>
      <td className="px-5 py-4">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[settlement.settlementStatus]}`}>
          {settlement.settlementStatus}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex min-w-[280px] gap-2">
          <input
            type="number"
            min="0"
            max={settlement.totalAmount}
            value={amount}
            disabled={disabled}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-leaf disabled:bg-gray-100"
          />
          <input
            value={notes}
            disabled={disabled}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="min-w-0 flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-leaf disabled:bg-gray-100"
          />
          <button
            disabled={disabled}
            onClick={() => onSettle(settlement.eventId, Number(amount), notes)}
            className="rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Settle
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [events, setEvents] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [donations, setDonations] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const stats = useMemo(() => {
    const totalDonations = settlements.reduce((sum, item) => sum + item.totalAmount, 0);
    const settled = settlements.reduce((sum, item) => sum + item.settledAmount, 0);
    const openTickets = tickets.filter(ticket => !["resolved", "closed"].includes(ticket.status)).length;
    return {
      pendingEvents: events.length,
      totalDonations,
      settled,
      pendingSettlement: Math.max(0, totalDonations - settled),
      openTickets
    };
  }, [events, settlements, tickets]);

  useEffect(() => {
    fetchData();
  }, [activeTab, ticketFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "overview") {
        const [eventRes, donationRes, ticketRes] = await Promise.all([
          eventApi.get("/api/events/pending"),
          eventApi.get("/api/donations/settlements"),
          eventApi.get("/api/tickets")
        ]);
        setEvents(eventRes.data.events || []);
        setSettlements(donationRes.data.settlements || []);
        setDonations(donationRes.data.donations || []);
        setTickets(ticketRes.data.tickets || []);
      } else if (activeTab === "verification") {
        const res = await eventApi.get("/api/events/pending");
        setEvents(res.data.events || []);
      } else if (activeTab === "donations") {
        const res = await eventApi.get("/api/donations/settlements");
        setSettlements(res.data.settlements || []);
        setDonations(res.data.donations || []);
      } else if (activeTab === "tickets") {
        const params = ticketFilter === "all" ? "" : `?status=${ticketFilter}`;
        const res = await eventApi.get(`/api/tickets${params}`);
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleEventAction = async (slug, action) => {
    try {
      setSavingId(slug);
      await eventApi.post(`/api/events/${slug}/${action}`, {});
      setEvents(current => current.filter(event => event.slug !== slug));
      toast.success(action === "approve" ? "Event approved" : "Event rejected");
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} event`);
    } finally {
      setSavingId("");
    }
  };

  const handleSettlement = async (eventId, amount, notes) => {
    try {
      setSavingId(eventId);
      const res = await eventApi.post(`/api/donations/settlement/${eventId}`, {
        settledAmount: amount,
        notes
      });
      setSettlements(current => current.map(item => item.eventId === eventId ? res.data.settlement : item));
      toast.success("Settlement updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update settlement");
    } finally {
      setSavingId("");
    }
  };

  const updateTicket = async (ticketId, updates) => {
    try {
      setSavingId(ticketId);
      const res = await eventApi.patch(`/api/tickets/${ticketId}`, updates);
      setTickets(current => current.map(ticket => ticket.id === ticketId ? res.data.ticket : ticket));
      toast.success("Ticket updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update ticket");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-gray-50">
      <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/10 text-leaf">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Admin Panel</h3>
              <p className="text-sm text-ink/50">{user?.fullName || user?.username || "Administrator"}</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 px-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-leaf text-white" : "text-ink hover:bg-mist"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-leaf">SOCNITI operations</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{tabs.find(tab => tab.id === activeTab)?.label}</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === tab.id ? "bg-leaf text-white" : "bg-white text-ink"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-mist"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-ink/10 bg-white">
            <Loader2 className="animate-spin text-leaf" size={32} />
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Pending Events" value={stats.pendingEvents} icon={Zap} tone="text-clay" />
                <StatCard label="Donations" value={currency.format(stats.totalDonations)} icon={DollarSign} />
                <StatCard label="Pending Settlement" value={currency.format(stats.pendingSettlement)} icon={Clock} tone="text-clay" />
                <StatCard label="Open Tickets" value={stats.openTickets} icon={Ticket} tone="text-leaf" />
              </div>
            )}

            {activeTab === "verification" && (
              events.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                  <CheckCircle size={44} className="mx-auto mb-4 text-leaf" />
                  <p className="font-semibold text-ink">All events are reviewed.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {events.map(event => (
                    <article key={event.id} className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold leading-snug text-ink">{event.title}</h3>
                        <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-bold text-clay">Pending</span>
                      </div>
                      <p className="mt-1 text-sm text-ink/60">By {event.organizerName || "Organizer"}</p>
                      <p className="mt-4 line-clamp-3 rounded-lg bg-gray-50 p-3 text-sm text-ink/70">{event.description}</p>
                      {event.paymentQr && (
                        <div className="mt-4 rounded-lg border border-ink/10 p-3">
                          <p className="text-xs font-semibold text-ink/50">Payment QR configured</p>
                          {event.paymentQr.startsWith("data:image/") && <img src={event.paymentQr} alt="Payment QR" className="mt-2 h-24 w-24 rounded-lg object-contain" />}
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button disabled={savingId === event.slug} onClick={() => handleEventAction(event.slug, "approve")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button disabled={savingId === event.slug} onClick={() => handleEventAction(event.slug, "reject")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-ember px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}

            {activeTab === "donations" && (
              <section className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard label="Total Donations" value={currency.format(stats.totalDonations)} icon={DollarSign} />
                  <StatCard label="Settled" value={currency.format(stats.settled)} icon={CheckCircle} tone="text-leaf" />
                  <StatCard label="Pending" value={currency.format(stats.pendingSettlement)} icon={Clock} tone="text-clay" />
                  <StatCard label="Records" value={donations.length} icon={DollarSign} />
                </div>
                {settlements.length === 0 ? (
                  <div className="rounded-xl border border-ink/10 bg-white p-8 text-center text-ink/60">No settlement records yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
                    <table className="w-full min-w-[980px]">
                      <thead className="border-b border-ink/10 bg-gray-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase text-ink/60">Event</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase text-ink/60">Total</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase text-ink/60">Settled</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase text-ink/60">Pending</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase text-ink/60">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase text-ink/60">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/10">
                        {settlements.map(settlement => <SettlementRow key={settlement.id} settlement={settlement} onSettle={handleSettlement} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === "tickets" && (
              <section className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-ink">Ticket Queue</h2>
                    <p className="text-sm text-ink/60">Assign, prioritize, and close support requests.</p>
                  </div>
                  <select value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value)} className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-leaf">
                    <option value="all">All statuses</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="waiting">Waiting</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                {tickets.length === 0 ? (
                  <div className="rounded-xl border border-ink/10 bg-white p-8 text-center text-ink/60">No tickets found.</div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {tickets.map(ticket => (
                      <article key={ticket.id} className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-ink">{ticket.subject}</h3>
                            <p className="mt-1 text-sm text-ink/60">From {ticket.userName} {ticket.userEmail ? `(${ticket.userEmail})` : ""}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                        </div>
                        {ticket.description && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-ink/70">{ticket.description}</p>}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[ticket.status]}`}>{ticket.status}</span>
                          <span className="text-xs text-ink/50">Created {new Date(ticket.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <select value={ticket.status} disabled={savingId === ticket.id} onChange={(e) => updateTicket(ticket.id, { status: e.target.value })} className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-leaf">
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="waiting">Waiting</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          <select value={ticket.priority} disabled={savingId === ticket.id} onChange={(e) => updateTicket(ticket.id, { priority: e.target.value })} className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-leaf">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <button disabled={savingId === ticket.id} onClick={() => updateTicket(ticket.id, { assignedTo: user?.id })} className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Assign to me</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "settings" && (
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-ink/10 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-clay" size={22} />
                    <h2 className="font-bold text-ink">Email Verification Disabled</h2>
                  </div>
                  <p className="mt-3 text-sm text-ink/60">New users can sign up and log in with their password immediately.</p>
                </div>
                <div className="rounded-xl border border-ink/10 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-leaf" size={22} />
                    <h2 className="font-bold text-ink">Protected Actions</h2>
                  </div>
                  <p className="mt-3 text-sm text-ink/60">Approvals, settlements, and ticket changes require an admin token.</p>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
