import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle, ArrowRight, Lock, Mail, User } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  
  // Modes: login, register, otp-verify
  const [mode, setMode] = useState("login");
  
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0 && mode === 'otp-verify') {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, mode]);

  const updateField = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const showError = (text) => setMessage({ type: "error", text });
  const showSuccess = (text) => setMessage({ type: "success", text });

  const triggerSendOtp = async (bypassLoading = false) => {
    if (!bypassLoading) setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const query = `
        mutation SendOtp($email: String!) {
          sendOtp(email: $email) {
            success
            message
          }
        }
      `;
      const response = await api.post("/graphql", { query, variables: { email: form.email } });
      if (response.data.errors) throw new Error(response.data.errors[0].message);

      const data = response.data.data.sendOtp;
      showSuccess(data.message || "Email delivery is disabled. Use the OTP shown in the server logs.");
      setCountdown(30);
      setMode("otp-verify");
    } catch (err) {
      showError(
        err.message === "Network Error"
          ? "Network Error: Could not connect to API."
          : err.response?.data?.errors?.[0]?.message || err.message
      );
    } finally {
      if (!bypassLoading) setLoading(false);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const query = `
          mutation Register($fullName: String!, $email: String!, $password: String!, $role: String) {
            register(fullName: $fullName, email: $email, password: $password, role: $role) {
              success
              message
            }
          }
        `;

        const res = await api.post("/graphql", { query, variables: form });
        if (res.data.errors) throw new Error(res.data.errors[0].message);

        const data = res.data.data.register;
        showSuccess(data.message || "Email delivery is disabled. Use the OTP shown in the server logs.");
        setCountdown(30);
        setOtp(["", "", "", "", "", ""]);
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setMode("otp-verify");
        return;
      }

      if (mode === "otp-verify") {
        const joinedOtp = otp.join("");
        if (joinedOtp.length < 6) throw new Error("Please enter a valid 6-digit OTP");
        
        const query = `
          mutation VerifyOtp($email: String!, $otp: String!) {
            verifyOtp(email: $email, otp: $otp) {
              token
              user { id role }
            }
          }
        `;
        const res = await api.post("/graphql", { query, variables: { email: form.email, otp: joinedOtp } });
        if (res.data.errors) throw new Error(res.data.errors[0].message);
        const data = res.data.data.verifyOtp;

        saveSession(data.token, data.user);
        navigate(data.user.role === "organizer" ? "/organizer" : "/dashboard");
        return;
      }

      if (mode === "login") {
        // Login via OTP (email only)
        await triggerSendOtp(false);
        return;
      }

    } catch (err) {
      if (err.message === "Network Error") {
        showError("Network Error: Could not connect to API." );
      } else {
        showError(err.response?.data?.errors?.[0]?.message || err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900/50 flex flex-col pt-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl tracking-tight font-extrabold text-gray-900 dark:text-white">
          {mode === "register" ? "Create an account" : mode === "otp-verify" ? "Verify your account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "register" ? "Start building with us today." : mode === "otp-verify" ? "Email delivery is disabled. Use the OTP shown in the server logs." : "Log in to your account to continue."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md mb-12">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700 transition-colors">
          
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={submit}>
            {/* EMAIL (Always visible unless OTP verify) */}
            {mode !== "otp-verify" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ">Email address</label>
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
            )}

            {/* OTP VERIFY */}
            {mode === "otp-verify" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Authentication Code</label>
                  <span className="text-xs text-gray-500 font-medium">{form.email}</span>
                </div>
                <div className="flex gap-2 sm:gap-3 justify-between">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      ref={(el) => otpRefs.current[index] = el}
                      value={data}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text").slice(0, 6).split("");
                        const newOtp = [...otp];
                        pasted.forEach((char, i) => { if(!isNaN(char)) newOtp[i] = char });
                        setOtp(newOtp);
                        if(pasted.length === 6) otpRefs.current[5]?.focus();
                      }}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
                    />
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={() => triggerSendOtp(false)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER FIELDS */}
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
                
              </>
            )}

            {/* PASSWORD (Register only) */}
            {mode === "register" && (
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
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* CONFIRM PASSWORD */}
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
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 mt-6 rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === "login" ? (
                  "Send OTP"
                ) : mode === "otp-verify" ? (
                  "Verify & Proceed"
                ) : (
                  "Create Account"
                )}
                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* FOOTER LINKS */}
          {mode !== "otp-verify" && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center text-sm">
                {mode === "login" ? (
                  <span className="text-gray-600 dark:text-gray-400">
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("register");
                        setMessage({ text: "" });
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Sign up for free
                    </button>
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("login");
                        setMessage({ text: "" });
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Log in here
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* BACK TO LOGIN FROM OTP */}
          {mode === "otp-verify" && (
            <div className="mt-6 text-center text-sm">
              <button
                onClick={() => {
                  setMode("login");
                  setMessage({ text: "" });
                }}
                className="font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
