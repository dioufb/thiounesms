import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, FileText } from "lucide-react";

const client = generateClient<Schema>();

type Template = Schema["Template"]["type"];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", body: "" });

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const { data } = await client.models.Template.list();
    setTemplates(data);
  }

  async function handleCreate() {
    if (!form.name || !form.body) return;
    if (form.body.length > 480) {
      alert("Template body must be 480 characters or less (3 SMS segments max)");
      return;
    }
    await client.models.Template.create(form);
    setForm({ name: "", body: "" });
    setOpen(false);
    loadTemplates();
  }

  async function handleDelete(id: string) {
    await client.models.Template.delete({ id });
    loadTemplates();
  }

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Reusable message templates with placeholders</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface2 border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create Template</DialogTitle>
              <DialogDescription className="text-muted-foreground">Use {"{{firstName}}"} and {"{{lastName}}"} as placeholders.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Name</Label>
                <Input className="bg-surface3 border-border text-foreground" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Message" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Message Body</Label>
                <Textarea className="bg-surface3 border-border text-foreground" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Bonjour {{firstName}}, bienvenue chez FDEV-INFO!" rows={4} />
              </div>
              <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <div className="bg-surface1 rounded-xl border border-border px-6 py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No templates yet. Create one to use when sending messages.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-surface1 rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{t.name}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 -mt-1 -mr-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-surface2 rounded-lg p-3 mt-2">{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
