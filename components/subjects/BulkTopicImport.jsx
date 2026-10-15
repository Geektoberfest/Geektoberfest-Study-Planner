"use client";

import { useState } from "react";
import { FileText, Loader2, Plus, Trash2, Check } from "lucide-react";
import { api, parseSyllabusText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export function BulkTopicImport({ subjectId, subjectName, onAdded }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [defaultDifficulty, setDefaultDifficulty] = useState("medium");
  const [defaultMinutes, setDefaultMinutes] = useState("60");
  const [defaultImportance, setDefaultImportance] = useState("5");
  const [parsedList, setParsedList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleParse = () => {
    setError("");
    const parsed = parseSyllabusText(rawText, {
      defaultDifficulty,
      defaultMinutes: Number(defaultMinutes) || 60,
      defaultImportance: Number(defaultImportance) || 5,
    });

    if (parsed.length === 0) {
      setError("No valid topics found. Make sure there is at least one topic name.");
      return;
    }

    setParsedList(parsed);
  };

  const updateItem = (index, field, value) => {
    setParsedList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (parsedList.length === 0) return;
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        subjectId,
        topics: parsedList.map((t) => ({
          name: t.name.trim(),
          difficulty: t.difficulty,
          estimatedMinutes: Number(t.estimatedMinutes) || 60,
          importance: Number(t.importance) || 5,
        })),
      };

      const res = await api("/api/topics/bulk", {
        method: "POST",
        body: payload,
      });

      toast({
        title: `Imported ${res.count} topics 🎉`,
        description:
          res.skippedCount > 0
            ? `${res.skippedCount} duplicate topic(s) were skipped.`
            : "Recalculate your plan to schedule them.",
        variant: "success",
      });

      setRawText("");
      setParsedList([]);
      setOpen(false);
      if (onAdded) onAdded();
    } catch (err) {
      setError(err.message);
      toast({ title: "Bulk import failed", description: err.message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-zinc-800">Bulk Import Syllabus</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Hide Import" : "Paste Syllabus"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-text">Paste topics or syllabus outline</Label>
            <textarea
              id="bulk-text"
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`1. Introduction to Algorithms\n2. Divide and Conquer\n- Dynamic Programming\n* Graph Traversals (BFS & DFS)`}
              className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm font-mono shadow-sm placeholder:text-zinc-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
            <p className="text-xs text-zinc-500">
              Supports numbered lists, bullet points (-, *, •), or one topic per line.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="default-diff" className="text-xs">
                Default difficulty
              </Label>
              <Select
                id="default-diff"
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="default-min" className="text-xs">
                Default minutes
              </Label>
              <Input
                id="default-min"
                type="number"
                min={5}
                max={600}
                value={defaultMinutes}
                onChange={(e) => setDefaultMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="default-imp" className="text-xs">
                Default priority (1-10)
              </Label>
              <Input
                id="default-imp"
                type="number"
                min={1}
                max={10}
                value={defaultImportance}
                onChange={(e) => setDefaultImportance(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleParse}
              disabled={!rawText.trim()}
            >
              Parse text into topics
            </Button>
            {parsedList.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setParsedList([])}
              >
                Clear parsed
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {parsedList.length > 0 && (
            <div className="space-y-2 border-t border-zinc-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700">
                  Review Parsed Topics ({parsedList.length})
                </span>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save All {parsedList.length} Topics
                </Button>
              </div>

              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {parsedList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 text-sm shadow-xs"
                  >
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      placeholder="Topic name"
                      className="h-8 flex-1 text-xs"
                    />
                    <Select
                      value={item.difficulty}
                      onChange={(e) => updateItem(idx, "difficulty", e.target.value)}
                      className="h-8 w-24 text-xs"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </Select>
                    <Input
                      type="number"
                      min={5}
                      max={600}
                      value={item.estimatedMinutes}
                      onChange={(e) =>
                        updateItem(idx, "estimatedMinutes", Number(e.target.value) || 60)
                      }
                      className="h-8 w-16 text-xs"
                      title="Estimated Minutes"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={item.importance}
                      onChange={(e) =>
                        updateItem(idx, "importance", Number(e.target.value) || 5)
                      }
                      className="h-8 w-14 text-xs"
                      title="Priority (1-10)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      className="h-7 w-7 text-zinc-400 hover:text-red-600"
                      aria-label="Remove topic from import"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
