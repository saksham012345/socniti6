import { useState } from "react";
import { X, Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { eventApi } from "../lib/api";
import toast from "react-hot-toast";

const categories = [
  "Environment",
  "Education",
  "Healthcare",
  "Animal Welfare",
  "Community Service",
  "Disaster Relief",
  "Other"
];

export default function CreateEventModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Environment",
    locationName: "",
    city: "",
    state: "",
    lat: "",
    lng: "",
    startsAt: "",
    maxParticipants: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.locationName || !formData.city || !formData.startsAt) {
      toast.error("Please fill in title, location, city, and start time");
      return;
    }

    setLoading(true);

    try {
      const res = await eventApi.post("/api/events", {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        locationName: formData.locationName,
        city: formData.city,
        state: formData.state,
        coordinates: {
          lat: parseFloat(formData.lat) || 0,
          lng: parseFloat(formData.lng) || 0
        },
        startsAt: new Date(formData.startsAt).toISOString(),
        maxParticipants: parseInt(formData.maxParticipants) || 50
      });

      toast.success("Event created successfully!");
      onSuccess?.();
      onClose();
      setFormData({ title: "", description: "", category: "Environment", locationName: "", city: "", state: "", lat: "", lng: "", startsAt: "", maxParticipants: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || error.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] shadow-soft">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ink/10 px-8 py-6 rounded-t-[2rem]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-ink">Create Event</h2>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-mist"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
              placeholder="Eye Donation Awareness Camp"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
              placeholder="Join us for an eye donation awareness camp..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location Name *
              </label>
              <input
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="Community Center"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="Mumbai"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Max Participants
              </label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="50"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="19.0760"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="72.8777"
              />
            </div>
          </div>

          {/* Start Date/Time */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              name="startsAt"
              value={formData.startsAt}
              onChange={handleChange}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-clay text-white py-3 px-4 rounded-full hover:bg-clay/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clay transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
