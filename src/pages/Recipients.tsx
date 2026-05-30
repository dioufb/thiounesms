import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Phone, User } from "lucide-react";

const client = generateClient<Schema>();

type Recipient = Schema["Recipient"]["type"];
type Group = Schema["Group"]["type"];

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "+221", groupId: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [r, g] = await Promise.all([
      client.models.Recipient.list(),
      client.models.Group.list(),
    ]);
    setRecipients(r.data);
    setGroups(g.data);
  }

  async function handleCreate() {
    if (!form.firstName || !form.lastName || !form.phoneNumber || !form.groupId) return;
    if (!/^\+221[0-9]{9}$/.test(form.phoneNumber)) {
      alert("Phone number must be a valid Senegal number: +221 followed by 9 digits");
      return;
    }
    await client.models.Recipient.create(form);
    setForm({ firstName: "", lastName: "", phoneNumber: "+221", groupId: "" });
    setOpen(false);
    loadData();
  }

  async function handleDelete(id: string) {
    await client.models.Recipient.delete({ id });
    loadData();
  }

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Recipients</h2>
          <p className="text-sm text-muted-foreground mt-1">{recipients.length} contact(s) registered</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />Add Recipient
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="bg-surface2 border-border">
            <DialogHeader><DialogTitle className="text-foreground">Add Recipient</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">First Name</Label>
                <Input className="bg-surface3 border-border text-foreground" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Last Name</Label>
                <Input className="bg-surface3 border-border text-foreground" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Phone Number</Label>
                <Input className="bg-surface3 border-border text-foreground" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+221XXXXXXXXX" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Group</Label>
                <Select value={form.groupId} onValueChange={(v) => setForm({ ...form, groupId: v })}>
                  <SelectTrigger className="bg-surface3 border-border text-foreground"><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent className="bg-surface2 border-border">
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-surface1 rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">All Recipients</h3>
        </div>
        {recipients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No recipients yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-surface2/50 transition-colors duration-150">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{r.firstName} {r.lastName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{r.phoneNumber}</p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
