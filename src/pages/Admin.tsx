import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, RefreshCw, Mail } from "lucide-react";

const client = generateClient<Schema>();

interface PendingUser {
  username: string;
  email: string;
  createdAt: string;
  status: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  async function loadPendingUsers() {
    setLoading(true);
    try {
      const response = await client.mutations.adminAction({ action: "list" });
      let parsed = { users: [] };
      if (response.data) {
        let data = response.data as string;
        // Handle double-stringification from AppSync
        try { data = JSON.parse(data); } catch {}
        parsed = typeof data === "string" ? JSON.parse(data) : data;
      }
      setUsers(parsed.users || []);
    } catch (err) {
      console.error("Failed to load pending users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(username: string) {
    setApproving(username);
    try {
      await client.mutations.adminAction({ action: "approve", username });
      setUsers((prev) => prev.filter((u) => u.username !== username));
    } catch (err) {
      console.error("Failed to approve user:", err);
    } finally {
      setApproving(null);
    }
  }

  useEffect(() => { loadPendingUsers(); }, []);

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#e4e4ed]">User Approvals</h2>
        <Button variant="outline" onClick={loadPendingUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-[#8888a4]">Loading pending users...</p>
      ) : users.length === 0 ? (
        <Card className="bg-[#12121a] border-[#1e1e2e]">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-[#34d399] mx-auto mb-3" />
              <p className="text-[#8888a4]">No pending users. All registrations have been approved.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => (
            <Card key={user.username} className="bg-[#12121a] border-[#1e1e2e]">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#fbbf24]/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-[#fbbf24]" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-[#e4e4ed]">{user.email}</CardTitle>
                      <p className="text-xs text-[#5a5a74] mt-0.5">
                        Registered {new Date(user.createdAt).toLocaleDateString()} · Status: {user.status}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleApprove(user.username)}
                    disabled={approving === user.username}
                    className="bg-[#34d399] hover:bg-[#34d399]/80 text-black"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {approving === user.username ? "Approving..." : "Approve"}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Settings Section */}
      <SettingsSection />
    </div>
  );
}

function SettingsSection() {
  const [dailyLimit, setDailyLimit] = useState("5");
  const [saved, setSaved] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    client.models.AppSettings.list({ filter: { key: { eq: "DAILY_SEND_LIMIT" } } }).then(({ data }) => {
      if (data.length > 0) {
        setDailyLimit(data[0].value);
        setSettingsId(data[0].id);
      }
    });
  }, []);

  async function handleSave() {
    if (settingsId) {
      await client.models.AppSettings.update({ id: settingsId, key: "DAILY_SEND_LIMIT", value: dailyLimit });
    } else {
      const { data } = await client.models.AppSettings.create({ key: "DAILY_SEND_LIMIT", value: dailyLimit });
      if (data) setSettingsId(data.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold text-[#e4e4ed] mb-4">Settings</h2>
      <Card className="bg-[#12121a] border-[#1e1e2e]">
        <CardHeader>
          <CardTitle className="text-base text-[#e4e4ed]">Daily Send Limit</CardTitle>
          <p className="text-sm text-[#5a5a74]">Maximum number of bulk SMS sends per user per day</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="100"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="w-24 h-9 rounded-md border border-[#1e1e2e] bg-[#0a0a0f] px-3 text-sm text-[#e4e4ed] focus:border-[#6366f1] focus:outline-none"
            />
            <Button onClick={handleSave} className="bg-[#6366f1] hover:bg-[#4f46e5]">
              {saved ? "✓ Saved" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
