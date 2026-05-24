import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ContactPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: user?.fullName || "",
        email: user?.email || "",
        subject: "",
        message: ""
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl font-bold text-ink">Get in Touch</h1>
        <p className="mt-4 text-lg text-ink/70 max-w-2xl mx-auto">
          Have questions or suggestions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* Contact Info */}
        <div className="space-y-6">
          {/* Contact Cards */}
          <div className="rounded-[2rem] bg-white p-8 shadow-soft">
            <h2 className="font-display text-2xl font-bold text-ink mb-6">Contact Information</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf/10">
                  <Mail className="h-6 w-6 text-leaf" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Email</h3>
                  <p className="text-sm text-ink/70 mt-1">socniti.project@gmail.com</p>
                  <p className="text-xs text-ink/60 mt-1">We'll respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-clay/10">
                  <Phone className="h-6 w-6 text-clay" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Phone</h3>
                  <p className="text-sm text-ink/70 mt-1">+91 98765 43210</p>
                  <p className="text-xs text-ink/60 mt-1">Mon-Fri, 9AM-6PM IST</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/10">
                  <MapPin className="h-6 w-6 text-ink" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Office</h3>
                  <p className="text-sm text-ink/70 mt-1">Mumbai, Maharashtra</p>
                  <p className="text-xs text-ink/60 mt-1">India</p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Support Status */}
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-leaf" />
              <div>
                <h3 className="font-semibold text-ink">Live Support</h3>
                <p className="text-xs text-ink/60">
                  Use Support Tickets for real-time help after signing in
                </p>
              </div>
            </div>
          </div>

          {/* Office Hours */}
          <div className="rounded-[2rem] bg-leaf/10 border border-leaf/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-leaf" />
              <h3 className="font-semibold text-ink">Office Hours</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/70">Monday - Friday</span>
                <span className="font-semibold text-ink">9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/70">Saturday</span>
                <span className="font-semibold text-ink">10:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/70">Sunday</span>
                <span className="font-semibold text-ink">Closed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-[2rem] bg-white p-8 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-6 w-6 text-leaf" />
            <h2 className="font-display text-2xl font-bold text-ink">Send us a Message</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Your Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="How can we help?"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Message *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                placeholder="Tell us more about your inquiry..."
                required
              />
              <p className="mt-2 text-xs text-ink/60">
                {formData.message.length} / 1000 characters
              </p>
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
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Message
                </>
              )}
            </button>

            {/* Success Message */}
            <div className="flex items-center gap-2 text-sm text-leaf">
              <CheckCircle size={16} />
              <span>For live support, open Support Tickets from your account sidebar.</span>
            </div>
          </form>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 rounded-[2rem] bg-white p-8 shadow-soft">
        <h2 className="font-display text-3xl font-bold text-ink mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-ink mb-2">How do I create an event?</h3>
            <p className="text-sm text-ink/70">
              Sign up as an organizer, navigate to the Events page, and click "Create Event". Fill in the details and publish!
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">Can I donate to multiple events?</h3>
            <p className="text-sm text-ink/70">
              Yes! You can donate money or items to any event. Visit the event page and click the "Donate" button.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">How do I register for an event?</h3>
            <p className="text-sm text-ink/70">
              Browse events, click on one you're interested in, and hit "Register". You'll receive confirmation via email.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">Is SOCNITI free to use?</h3>
            <p className="text-sm text-ink/70">
              Yes! SOCNITI is completely free for volunteers and organizers. We're here to help communities connect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
