import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { CheckCircle, XCircle, Clock, History } from "lucide-react";

const client = generateClient<Schema>();

type SendLog = Schema["SendLog"]["type"];

export default function HistoryPage() {
  const [logs, setLogs] = useState<SendLog[]>([]);

  useEffect(() => {
    client.models.SendLog.list().then(({ data }) => {
      setLogs(data.sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
    });
  }, []);

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "SENT": return <CheckCircle className="h-4 w-4 text-success" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string | null) => {
    const base = "text-xs px-2 py-0.5 rounded-full font-medium";
    switch (status) {
      case "SENT": return `${base} bg-success/10 text-success`;
      case "FAILED": return `${base} bg-destructive/10 text-destructive`;
      default: return `${base} bg-muted text-muted-foreground`;
    }
  };

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Send History</h2>
        <p className="text-sm text-muted-foreground mt-1">{logs.length} message(s) sent</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-surface1 rounded-xl border border-border px-6 py-12 text-center">
          <History className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No messages sent yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-surface1 rounded-xl border border-border p-5 hover:border-primary/20 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(log.status ?? null)}
                  <div>
                    <p className="font-medium text-foreground">{log.templateName}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Group: <span className="text-foreground/80">{log.groupName}</span> · {log.recipientCount} recipient(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusBadge(log.status ?? null)}>{log.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.sentAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
