"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  topicFromIntake,
  type Topic,
  type TopicSource,
} from "@/lib/topics";

export function AddTopicDialog({
  open,
  onOpenChange,
  existing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: Topic[];
  onSave: (topic: Topic) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<TopicSource>("hr");
  const [why, setWhy] = useState("");
  const [points, setPoints] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setSource("hr");
    setWhy("");
    setPoints("");
    setFile(null);
    setError("");
  }

  async function submit() {
    if (!title.trim()) {
      setError("Add a title.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let pdf = "";
      let fileName = "";
      if (file) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/files", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not upload PDF.");
        pdf = data.url;
        fileName = data.fileName;
      }
      const topic = topicFromIntake({
        title,
        source,
        why,
        talkingPoints: points,
        pdf,
        fileName,
        existing,
      });
      await onSave(topic);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save topic.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add topic</DialogTitle>
          <DialogDescription>
            Paste a packet from HR or AI. Attach the PDF if you have one.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="topic-title">Title</Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lockout / tagout"
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="topic-source">From</Label>
            <select
              id="topic-source"
              value={source}
              onChange={(e) => setSource(e.target.value as TopicSource)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-base"
            >
              <option value="hr">HR</option>
              <option value="ai">AI draft</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="topic-why">Why this meeting</Label>
            <Textarea
              id="topic-why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="topic-points">Talking points</Label>
            <Textarea
              id="topic-points"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="One point per line"
              rows={5}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="topic-pdf">PDF</Label>
            <Input
              id="topic-pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? "Saving…" : "Save topic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
