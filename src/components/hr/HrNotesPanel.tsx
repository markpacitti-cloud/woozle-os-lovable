import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";

import { HrEmpty, HrError, HrLoading } from "@/components/hr/HrShared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import type { HrNote } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrNotesPanel({
  staffId,
  caseId,
}: {
  staffId: string;
  caseId?: string | undefined;
}) {
  const { handleApiError } = useAuth();
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState("");
  const [share, setShare] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [busy, setBusy] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["hr-notes", staffId, caseId ?? "all"],
    queryFn: async () => {
      let query = api.from("hr_notes_list").select("*").eq("staff_id", staffId);
      if (caseId) query = query.eq("case_id", caseId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrNote[];
    },
  });
  const typesQuery = useQuery({
    queryKey: ["hr-setting", "hr.note_types"],
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_settings")
        .select("key,value")
        .eq("key", "hr.note_types")
        .maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return Array.isArray(data?.value)
        ? data.value.filter((value): value is string => typeof value === "string")
        : [];
    },
  });

  const addNote = async () => {
    if (!body.trim()) {
      toast.error("Write a note first.");
      return;
    }
    if (!noteType) {
      toast.error("Choose a note type.");
      return;
    }
    setBusy(true);
    const { error } = await api.rpc("hr_add_note", {
      p_staff_id: staffId,
      p_body: body.trim(),
      p_note_type: noteType,
      ...(caseId ? { p_case_id: caseId } : {}),
      p_share: share,
    });
    setBusy(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success(share ? "Note added and shared" : "Note added");
    setBody("");
    setShare(false);
    setAdding(false);
    await notesQuery.refetch();
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    const { error } = await api.rpc("hr_update_note", { p_note_id: id, p_body: editBody.trim() });
    setBusy(false);
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Note updated");
    setEditingId(null);
    await notesQuery.refetch();
  };

  const shareNote = async (id: string) => {
    if (
      !window.confirm(
        "Share this note with the employee? They will be able to see it. This cannot be undone.",
      )
    )
      return;
    const { error } = await api.rpc("hr_share_note", { p_note_id: id });
    if (error) {
      handleApiError(error);
      return;
    }
    toast.success("Note shared with employee");
    await notesQuery.refetch();
  };

  return (
    <div>
      <div className="flex justify-end px-4 py-3">
        <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add note
        </Button>
      </div>
      {adding ? (
        <div className="space-y-3 border-y border-border bg-surface-subtle p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Note type</Label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="bg-background">
                <SelectValue
                  placeholder={typesQuery.isPending ? "Loading types…" : "Choose a type"}
                />
              </SelectTrigger>
              <SelectContent>
                {(typesQuery.data ?? []).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a private HR note…"
            className="min-h-28 bg-background"
          />
          <label className="flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={share}
              onChange={(event) => setShare(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-current"
            />
            <span>
              <strong>Share with employee.</strong> They will be able to read this note. Sharing
              cannot be undone.
            </span>
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy || typesQuery.data?.length === 0}
              onClick={() => void addNote()}
            >
              Add note
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {notesQuery.isPending ? (
        <HrLoading rows={3} />
      ) : notesQuery.isError ? (
        <HrError
          message={getErrorMessage(notesQuery.error)}
          retry={() => void notesQuery.refetch()}
        />
      ) : (notesQuery.data ?? []).length === 0 ? (
        <HrEmpty title="No notes" description="Notes about this person will appear here." />
      ) : (
        <ul className="divide-y divide-row-divider">
          {(notesQuery.data ?? []).map((note) => (
            <li key={note.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="grey">{note.note_type}</Badge>
                {note.is_shared_with_employee ? (
                  <Badge variant="green">Shared with employee</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {note.author_name} · {formatDateTime(note.created_at)}
                </span>
                {note.can_edit ? (
                  <span className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Edit note"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditBody(note.body);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!note.is_shared_with_employee ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Share with employee"
                        onClick={() => void shareNote(note.id)}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {editingId === note.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    className="min-h-24"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy || !editBody.trim()}
                      onClick={() => void saveEdit(note.id)}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
