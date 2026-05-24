import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import ModernLoginPage from "./pages/ModernLoginPage";
import ModernSignupPage from "./pages/ModernSignupPage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import OrganizerDashboardPage from "./pages/OrganizerDashboardPage";
import DonationsPage from "./pages/DonationsPage";
import ContactPage from "./pages/ContactPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SupportPage from "./pages/SupportPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AgentDashboardPage from "./pages/AgentDashboardPage";

function RoleProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<ModernLoginPage />} />
          <Route path="/signup" element={<ModernSignupPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute roles={["user", "organizer", "admin"]}>
                  <UserDashboardPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute roles={["organizer", "admin"]}>
                  <OrganizerDashboardPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <SupportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:ticketId"
            element={
              <ProtectedRoute>
                <TicketDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute roles={["admin"]}>
                  <AdminDashboardPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute roles={["admin", "agent"]}>
                  <AgentDashboardPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Shell>
    </>
  );
}

