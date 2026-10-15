"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Pencil, Trash2 } from "lucide-react";
import { api, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { AiTopicGenerator } from "./AiTopicGenerator";
import { BulkTopicImport } from "./BulkTopicImport";
import { TopicForm } from "./TopicForm";

export function TopicsManager({ subject, topics, onChanged, showCompletedToggle = true }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const addTopic = async (values) => {
    setAdding(true);
    try {
      await api("/api/topics", { method: "POST", body: { subjectId: subject.id, ...values } });
      toast({
        title: "Topic added",
        description: "Recalculate your plan to schedule it.",
        variant: "success",
      });
      if (onChanged) onChanged();
    } catch (err) {
      toast({ title: "Could not add topic", description: err.message, variant: "error" });
    } finally {
      setAdding(false);
    }
  };

  const updateTopic = async (values) => {
    setBusy(true);
    try {
      await api(`/api/topics/${editing.id}`, { method: "PATCH", body: values });
      toast({ title: "Topic updated", variant: "success" });
      setEditing(null);
      if (onChanged) onChanged();
    } catch (err) {
      toast({ title: "Could not update topic", description: err.message, variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const toggleCompleted = async (topic) => {
    try {
      await api(`/api/topics/${topic.id}`, { method: "PATCH", body: { completed: !topic.completed } });
      if (onChanged) onChanged();
    } catch (err) {
      toast({ title: "Could not update topic", description: err.message, variant: "error" });
    }
  };

  const deleteTopic = async () => {
    if (!deleting) return;
    setConfirmBusy(true);
    try {
      await api(`/api/topics/${deleting.id}`, { method: "DELETE" });
      toast({ title: "Topic deleted" });
      setDeleting(null);
      if (onChanged) onChanged();
    } catch (err) {
      toast({ title: "Could not delete topic", description: err.message, variant: "error" });
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <AiTopicGenerator subjectId={subject.id} subjectName={subject.name} onAdded={onChanged} />

      <BulkTopicImport subjectId={subject.id} subjectName={subject.name} onAdded={onChanged} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700">Add a topic manually</p>
        <TopicForm onSubmit={addTopic} submitting={adding} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-700">
          Topics {topics.length > 0 && <span className="text-zinc-400">({topics.length})</span>}
        </p>
        {topics.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-400">
            No topics yet. Generate with AI or add them manually above.
          </p>
        ) : (
          topics.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {showCompletedToggle ? (
                  <button
                    type="button"
                    onClick={() => toggleCompleted(t)}
                    aria-label={t.completed ? "Mark as not completed" : "Mark as completed"}
                    className={cn(
                      "shrink-0",
                      t.completed ? "text-emerald-500" : "text-zinc-300 hover:text-emerald-400"
                    )}
                  >
                    {t.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                ) : null}
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-medium", t.completed && "text-zinc-400 line-through")}>
                    {t.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t.estimatedMinutes} min · priority {t.importance}/10
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge variant={t.difficulty === "easy" ? "success" : t.difficulty === "hard" ? "destructive" : "default"}>
                  {t.difficulty}
                </Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(t)} aria-label="Edit topic">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-red-600"
                  onClick={() => setDeleting(t)}
                  aria-label="Delete topic"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit topic">
        {editing && (
          <TopicForm
            key={editing.id}
            initial={editing}
            onSubmit={updateTopic}
            submitting={busy}
            submitLabel="Save Changes"
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={deleteTopic}
        busy={confirmBusy}
        title="Delete topic"
        description={`"${deleting?.name}" and its sessions will be removed. This cannot be undone.`}
      />
    </div>
  );
}
