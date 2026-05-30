import { useState, useEffect } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Users, FolderOpen, FileText, Send, History, LogOut, MessageSquare, Shield, Clock } from "lucide-react";
import RecipientsPage from "@/pages/Recipients";
import GroupsPage from "@/pages/Groups";
import TemplatesPage from "@/pages/Templates";
import SendPage from "@/pages/Send";
import HistoryPage from "@/pages/History";
import AdminPage from "@/pages/Admin";

const navItems = [
  { to: "/recipients", label: "Recipients", icon: Users },
  { to: "/groups", label: "Groups", icon: FolderOpen },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/send", label: "Send", icon: Send },
  { to: "/history", label: "History", icon: History },
];

function PendingScreen({ signOut }: { signOut?: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="text-center max-w-md p-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#fbbf24]/10 flex items-center justify-center mb-6">
          <Clock className="h-8 w-8 text-[#fbbf24]" />
        </div>
        <h2 className="text-2xl font-bold text-[#e4e4ed] mb-3">Pending Approval</h2>
        <p className="text-[#8888a4] mb-6">
          Your account has been created but is awaiting admin approval. You'll be able to access the app once an administrator approves your registration.
        </p>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-lg bg-[#1a1a28] border border-[#1e1e2e] text-[#8888a4] hover:text-[#e4e4ed] transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AppContent({ signOut }: { signOut?: () => void }) {
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthSession().then((session) => {
      const userGroups = (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[]) || [];
      setGroups(userGroups);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="animate-pulse text-[#8888a4]">Loading...</div>
      </div>
    );
  }

  const isAdmin = groups.includes("ADMINS");
  const isApproved = groups.includes("APPROVED_USERS") || isAdmin;

  if (!isApproved) {
    return <PendingScreen signOut={signOut} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#0a0a0f]">
        {/* Sidebar */}
        <aside className="group fixed left-0 top-0 h-full z-40 w-[60px] hover:w-[240px] transition-all duration-300 ease-in-out bg-[#12121a] border-r border-[#1e1e2e] flex flex-col overflow-hidden">
          <div className="flex items-center h-16 px-4 border-b border-[#1e1e2e] shrink-0">
            <MessageSquare className="h-6 w-6 text-[#6366f1] shrink-0" />
            <span className="ml-3 font-bold text-[#e4e4ed] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">FDEV-INFO</span>
          </div>

          <nav className="flex flex-col gap-1 flex-1 p-2 mt-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#6366f1]/15 text-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                      : "text-[#8888a4] hover:text-[#e4e4ed] hover:bg-[#22223a]"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#6366f1]/15 text-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                      : "text-[#8888a4] hover:text-[#e4e4ed] hover:bg-[#22223a]"
                  }`
                }
              >
                <Shield className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Admin</span>
              </NavLink>
            )}
          </nav>

          <div className="p-2 border-t border-[#1e1e2e]">
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8888a4] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all duration-200 w-full"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 ml-[60px] flex flex-col">
          <header className="h-16 border-b border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 sticky top-0 z-30">
            <h1 className="text-lg font-semibold text-[#e4e4ed]">FDEV-INFO SMS</h1>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="text-xs px-2 py-1 rounded bg-[#6366f1]/20 text-[#6366f1] font-medium">ADMIN</span>
              )}
              <div className="h-8 w-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center">
                <span className="text-xs font-medium text-[#6366f1]">U</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/send" replace />} />
              <Route path="/recipients" element={<RecipientsPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/send" element={<SendPage />} />
              <Route path="/history" element={<HistoryPage />} />
              {isAdmin && <Route path="/admin" element={<AdminPage />} />}
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut }) => <AppContent signOut={signOut} />}
    </Authenticator>
  );
}
