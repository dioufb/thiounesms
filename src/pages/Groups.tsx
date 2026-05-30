import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Users, FolderOpen } from "lucide-react";

const client = generateClient<Schema>();

type Group = Schema["Group"]["type"];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [recipientCounts, setRecipientCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    const { data } = await client.models.Group.list();
    setGroups(data);
    const { data: recipients } = await client.models.Recipient.list();
    const counts: Record<string, number> = {};
    recipients.forEach((r) => { counts[r.groupId] = (counts[r.groupId] || 0) + 1; });
    setRecipientCounts(counts);
  }

  async function handleCreate() {
    if (!form.name) return;
    await client.models.Group.create(form);
    setForm({ name: "", description: "" });
    setOpen(false);
    loadGroups();
  }

  async function handleDelete(id: string) {
    await client.models.Group.delete({ id });
    loadGroups();
  }

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Groups</h2>
          <p className="text-sm text-muted-foreground mt-1">Organize your recipients into groups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />Create Group
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="bg-surface2 border-border">
            <DialogHeader><DialogTitle className="text-foreground">Create Group</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Name</Label>
                <Input className="bg-surface3 border-border text-foreground" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Clients Dakar" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Description</Label>
                <Input className="bg-surface3 border-border text-foreground" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <div className="bg-surface1 rounded-xl border border-border px-6 py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No groups yet. Create one to organize your recipients.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-surface1 rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-secondary" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 -mt-1 -mr-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="font-semibold text-foreground">{g.name}</h3>
              {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
              <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{recipientCounts[g.id] || 0} recipients</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
