import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle, ArrowRight, Lock, Mail, User } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const updateField = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) throw new Error("Passwords do not match");

        const query = `
          mutation Signup($fullName: String!, $username: String!, $email: String!, $password: String!, $role: String) {
            signup(fullName: $fullName, username: $username, email: $email, password: $password, role: $role) {
              token
              user { id username fullName email role }
            }
          }
        `;
        const res = await api.post("/graphql", { query, variables: form });
        if (res.data.errors) throw new Error(res.data.errors[0].message);

        const data = res.data.data.signup;
        saveSession(data.token, data.user);
        navigate(data.user.role === "organizer" ? "/organizer" : "/dashboard");
        return;
      }

      const query = `
        mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            token
            user { id username fullName email role }
          }
        }
      `;
      const res = await api.post("/graphql", {
        query,
        variables: { username: form.username, password: form.password },
      });
      if (res.data.errors) throw new Error(res.data.errors[0].message);

      const data = res.data.data.login;
      saveSession(data.token, data.user);
      navigate(data.user.role === "organizer" ? "/organizer" : "/dashboard");
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message === "Network Error"
          ? "Network Error: Could not connect to API."
          : err.response?.data?.errors?.[0]?.message || err.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900/50 flex flex-col pt-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl tracking-tight font-extrabold text-gray-900 dark:text-white">
          {mode === "register" ? "Create an account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "register" ? "Start building with us today." : "Log in to your account to continue."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md mb-12">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700 transition-colors">
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${message.type === "error" ? "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300"}`}>
              {message.type === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="username"
                  required
                  value={form.username}
                  onChange={updateField}
                  placeholder="jane_doe"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                />
              </div>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="fullName"
                      required
                      value={form.fullName}
                      onChange={updateField}
                      placeholder="Jane Doe"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={updateField}
                      placeholder="you@example.com"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={updateField}
                  placeholder="Password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={updateField}
                    placeholder="Confirm password"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 mt-6 rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? "Log In" : "Create Account"}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center text-sm">
              {mode === "login" ? (
                <span className="text-gray-600 dark:text-gray-400">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("register")} className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                    Sign up for free
                  </button>
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                    Log in here
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
