import { useState } from "react";
import { X, DollarSign, Package, Loader2 } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

export default function DonationModal({ isOpen, onClose, eventId, eventTitle, paymentQr }) {
  const [loading, setLoading] = useState(false);
  const [donationType, setDonationType] = useState("monetary");
  const [formData, setFormData] = useState({
    amount: "",
    item: "",
    quantity: "",
    message: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (donationType === "monetary" && (!formData.amount || formData.amount <= 0)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (donationType === "item" && (!formData.item || !formData.quantity)) {
      toast.error("Please provide item details");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/graphql", {
        query: `
          mutation CreateDonation($input: CreateDonationInput!) {
            createDonation(input: $input) {
              id
              amount
              item
              donorName
              createdAt
            }
          }
        `,
        variables: {
          input: {
            eventId,
            type: donationType,
            amount: donationType === "monetary" ? parseFloat(formData.amount) : null,
            item: donationType === "item" ? formData.item : null,
            quantity: donationType === "item" ? parseInt(formData.quantity) : null,
            message: formData.message
          }
        }
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      toast.success("Thank you for your donation!");
      onClose();
      setFormData({ amount: "", item: "", quantity: "", message: "" });
    } catch (error) {
      console.error("Donation error:", error);
      toast.error(error.response?.data?.errors?.[0]?.message || error.message || "Failed to process donation");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-soft">
        {/* Header */}
        <div className="border-b border-ink/10 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Make a Donation</h2>
              <p className="text-sm text-ink/70 mt-1">{eventTitle}</p>
            </div>
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
          {/* Donation Type */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-3">
              Donation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDonationType("monetary")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 font-semibold transition-all ${
                  donationType === "monetary"
                    ? "border-leaf bg-leaf/10 text-leaf"
                    : "border-ink/15 text-ink/70 hover:border-ink/30"
                }`}
              >
                <DollarSign size={20} />
                Money
              </button>
              <button
                type="button"
                onClick={() => setDonationType("item")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 font-semibold transition-all ${
                  donationType === "item"
                    ? "border-leaf bg-leaf/10 text-leaf"
                    : "border-ink/15 text-ink/70 hover:border-ink/30"
                }`}
              >
                <Package size={20} />
                Items
              </button>
            </div>
          </div>

          {/* Monetary Donation */}
          {donationType === "monetary" && (
            <>
              {paymentQr && (
                <div className="rounded-2xl border border-ink/10 bg-mist p-4">
                  <p className="mb-3 text-sm font-semibold text-ink">Payment QR / Link</p>
                  {paymentQr.startsWith("data:image/") ? (
                    <img src={paymentQr} alt="Payment QR" className="mx-auto h-44 w-44 rounded-xl bg-white object-contain p-2" />
                  ) : (
                    <div className="flex gap-2">
                      <input value={paymentQr} readOnly className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm" />
                      <button type="button" onClick={() => { navigator.clipboard.writeText(paymentQr); toast.success("Payment link copied"); }} className="rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-white">Copy</button>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                  placeholder="500"
                  min="1"
                  required
                />
              </div>
            </>
          )}

          {/* Item Donation */}
          {donationType === "item" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="item"
                  value={formData.item}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                  placeholder="Medical supplies, books, etc."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
                  placeholder="10"
                  min="1"
                  required
                />
              </div>
            </>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Message (Optional)
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3 focus:ring-2 focus:ring-leaf focus:border-transparent"
              placeholder="Add a message of support..."
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
                Processing...
              </>
            ) : (
              `Donate ${donationType === "monetary" ? "₹" + formData.amount : formData.item}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
