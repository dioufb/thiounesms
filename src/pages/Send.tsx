import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Eye, CheckCircle, AlertTriangle } from "lucide-react";

const client = generateClient<Schema>();

type Group = Schema["Group"]["type"];
type Template = Schema["Template"]["type"];
type Recipient = Schema["Recipient"]["type"];

export default function SendPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; message?: string } | null>(null);

  useEffect(() => {
    Promise.all([client.models.Group.list(), client.models.Template.list()]).then(([g, t]) => {
      setGroups(g.data);
      setTemplates(t.data);
    });
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      client.models.Recipient.list({ filter: { groupId: { eq: selectedGroupId } } }).then(({ data }) => setRecipients(data));
    } else {
      setRecipients([]);
    }
  }, [selectedGroupId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  function previewMessage(recipient: Recipient) {
    if (!selectedTemplate) return "";
    return selectedTemplate.body
      .replace(/\{\{firstName\}\}/g, recipient.firstName)
      .replace(/\{\{lastName\}\}/g, recipient.lastName);
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      const response = await client.mutations.sendSMS({ groupId: selectedGroupId, templateId: selectedTemplateId });
      let parsed = { sent: 0, failed: recipients.length, success: false, error: "", message: "" };
      if (response.data) {
        let data = response.data as string;
        try { data = JSON.parse(data); } catch {}
        parsed = typeof data === "string" ? JSON.parse(data) : data;
      }
      if (parsed.error === "QUOTA_EXCEEDED") {
        setResult({ sent: 0, failed: 0, message: parsed.message });
      } else {
        setResult({ sent: parsed.sent, failed: parsed.failed });
      }
      await client.models.SendLog.create({
        templateName: selectedTemplate?.name || "",
        groupName: selectedGroup?.name || "",
        recipientCount: recipients.length,
        status: parsed.failed === 0 ? "SENT" : "FAILED",
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      setResult({ sent: 0, failed: recipients.length });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  const canSend = selectedGroupId && selectedTemplateId && recipients.length > 0;

  return (
    <div className="max-w-2xl animate-[fadeIn_0.3s_ease]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Send SMS</h2>
        <p className="text-sm text-muted-foreground mt-1">Compose and send messages to your groups</p>
      </div>

      <div className="grid gap-5">
        {/* Step 1 */}
        <div className="bg-surface1 rounded-xl border border-border p-6 hover:border-primary/20 transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">1</div>
            <div>
              <h3 className="font-semibold text-foreground">Select Group</h3>
              <p className="text-xs text-muted-foreground">Choose which recipients will receive the message</p>
            </div>
          </div>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="bg-surface3 border-border text-foreground"><SelectValue placeholder="Select a group" /></SelectTrigger>
            <SelectContent className="bg-surface2 border-border">
              {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedGroupId && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-success"></span>
              {recipients.length} recipient(s) in this group
            </p>
          )}
        </div>

        {/* Step 2 */}
        <div className="bg-surface1 rounded-xl border border-border p-6 hover:border-primary/20 transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">2</div>
            <div>
              <h3 className="font-semibold text-foreground">Select Template</h3>
              <p className="text-xs text-muted-foreground">Choose the message to send</p>
            </div>
          </div>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="bg-surface3 border-border text-foreground"><SelectValue placeholder="Select a template" /></SelectTrigger>
            <SelectContent className="bg-surface2 border-border">
              {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <div className="mt-4 p-4 bg-surface2 rounded-lg border border-border">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
              <p className="text-sm mt-2 text-foreground whitespace-pre-wrap">
                {recipients.length > 0 ? previewMessage(recipients[0]) : selectedTemplate.body}
              </p>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-5 flex items-center gap-3 ${result.failed === 0 ? "bg-success/5 border-success/30" : "bg-destructive/5 border-destructive/30"}`}>
            {result.failed === 0 ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
            <p className="font-medium text-foreground">
              {result.failed === 0 ? "All messages sent successfully!" : `${result.sent} sent, ${result.failed} failed`}
            </p>
          </div>
        )}

        {/* Action */}
        <Button
          disabled={!canSend}
          onClick={() => setConfirmOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-200 h-11"
        >
          <Eye className="h-4 w-4 mr-2" />Preview & Send
        </Button>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-surface2 border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Send</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Send to <strong className="text-foreground">{recipients.length}</strong> recipient(s) in <strong className="text-foreground">{selectedGroup?.name}</strong> using template <strong className="text-foreground">{selectedTemplate?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-auto border border-border rounded-lg p-3 bg-surface3 text-sm">
            {recipients.slice(0, 5).map((r) => (
              <div key={r.id} className="py-2 border-b border-border last:border-0">
                <span className="font-medium text-foreground">{r.firstName} {r.lastName}</span>
                <span className="text-muted-foreground ml-2">{r.phoneNumber}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{previewMessage(r)}</p>
              </div>
            ))}
            {recipients.length > 5 && <p className="text-muted-foreground pt-2">...and {recipients.length - 5} more</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="border-border text-foreground hover:bg-surface3">Cancel</Button>
            <Button onClick={handleSend} disabled={sending} className="bg-primary hover:bg-primary/90 text-white">
              <Send className="h-4 w-4 mr-2" />{sending ? "Sending..." : "Send Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
