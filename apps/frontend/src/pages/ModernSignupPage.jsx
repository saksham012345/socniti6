import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import { UserPlus, User, Mail, Lock, Shield, Loader2 } from "lucide-react";

export default function ModernSignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "user"
  });
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
        variables: formData
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const { token, user } = response.data.data.signup;
      saveSession(token, user);
      toast.success("Account created successfully!");
      navigate(user.role === "organizer" ? "/organizer" : "/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.response?.data?.errors?.[0]?.message || error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ink rounded-2xl mb-4 shadow-soft">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">Create Account</h1>
          <p className="text-ink/70 mt-2">Join SOCNITI and make an impact</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-soft p-8 border border-ink/10">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Full Name</label>
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

            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Username</label>
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

            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Email Address</label>
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

            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Password</label>
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
                  placeholder="Password"
                  disabled={loading}
                />
              </div>
              <p className="mt-1 text-xs text-ink/60">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-2">I want to</label>
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

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-ink/70">Already have an account?</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-leaf hover:text-leaf/80 font-semibold transition-colors"
            >
              Sign in instead
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-ink/60 mt-8">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
