import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import { UserPlus, User, Mail, Lock, Shield, Loader2, CheckCircle } from "lucide-react";

export default function ModernSignupPage() {
  const [step, setStep] = useState(1); // 1: signup form, 2: OTP verification
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "user"
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/graphql", {
        query: `
          mutation Signup($fullName: String!, $username: String!, $email: String!, $password: String!, $role: String) {
            signup(fullName: $fullName, username: $username, email: $email, password: $password, role: $role) {
              success
              message
            }
          }
        `,
        variables: formData
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const { success, message } = response.data.data.signup;
      
      if (success) {
        toast.success(message);
        setStep(2);
      } else {
        toast.error(message);
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.response?.data?.errors?.[0]?.message || error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/graphql", {
        query: `
          mutation VerifyOtp($email: String!, $otp: String!) {
            verifySignupOtp(email: $email, otp: $otp) {
              token
              user {
                id
                username
                fullName
                email
                role
              }
            }
          }
        `,
        variables: { email: formData.email, otp }
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const { token, user } = response.data.data.verifySignupOtp;
      saveSession(token, user);
      toast.success("Account verified successfully!");
      navigate("/");
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(error.response?.data?.errors?.[0]?.message || error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ink rounded-2xl mb-4 shadow-soft">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">
            {step === 1 ? "Create Account" : "Verify Your Account"}
          </h1>
          <p className="text-ink/70 mt-2">
            {step === 1 ? "Join SOCNITI and make an impact" : "Enter the OTP shown in the server logs"}
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-[2rem] shadow-soft p-8 border border-ink/10">
          {step === 1 ? (
            <form onSubmit={handleSignup} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-leaf" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-leaf" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                    placeholder="johndoe"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-ink/60">At least 3 characters, letters and numbers only</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-leaf" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                    placeholder="john@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-leaf" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-ink/60">At least 6 characters</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  I want to
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-leaf" />
                  </div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                    disabled={loading}
                  >
                    <option value="user">Participate in events</option>
                    <option value="organizer">Organize events</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-clay text-white py-3 px-4 rounded-full hover:bg-clay/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clay transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-soft hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Create Account
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* OTP Info */}
              <div className="bg-leaf/10 border border-leaf/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-leaf mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Email delivery is disabled</p>
                    <p className="text-sm text-ink/70 mt-1">
                      Ask an admin for the 6-digit OTP printed in the backend server logs for <strong>{formData.email}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="block w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-clay text-white py-3 px-4 rounded-full hover:bg-clay/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clay transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-soft hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Verify & Continue
                  </>
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-ink/70 hover:text-ink py-2 text-sm font-semibold transition-colors"
                disabled={loading}
              >
                ← Back to signup
              </button>
            </form>
          )}

          {step === 1 && (
            <>
              {/* Divider */}
              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ink/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-ink/70">Already have an account?</span>
                </div>
              </div>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-leaf hover:text-leaf/80 font-semibold transition-colors"
                >
                  Sign in instead →
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-ink/60 mt-8">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
