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
import { normaliseFormFields } from "@/lib/hr";
import type { HrAnswers, HrFormField } from "@/lib/hr-types";

export function HrAnswersForm({
  fields,
  answers,
  onChange,
  onFile,
  disabled = false,
}: {
  fields: HrFormField[] | null | undefined;
  answers: HrAnswers;
  onChange: (answers: HrAnswers) => void;
  onFile?: (field: HrFormField, file: File) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {normaliseFormFields(fields).map((field) => {
        const id = `hr-answer-${field.key}`;
        const value = answers[field.key];
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">
              {field.label}
              {field.required ? <span className="ml-1 text-destructive">*</span> : null}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={id}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange({ ...answers, [field.key]: event.target.value })}
                disabled={disabled}
                required={field.required}
                className="min-h-24"
              />
            ) : field.type === "select" ? (
              <Select
                value={typeof value === "string" ? value : ""}
                onValueChange={(next) => onChange({ ...answers, [field.key]: next })}
                disabled={disabled}
              >
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "boolean" ? (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  id={id}
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => onChange({ ...answers, [field.key]: event.target.checked })}
                  disabled={disabled}
                  className="h-4 w-4 accent-current"
                />
                Yes
              </label>
            ) : field.type === "file" ? (
              <Input
                id={id}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={disabled}
                required={field.required && !value}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && onFile) onFile(field, file);
                }}
              />
            ) : (
              <Input
                id={id}
                type={field.type === "phone" ? "tel" : field.type}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange({ ...answers, [field.key]: event.target.value })}
                disabled={disabled}
                required={field.required}
              />
            )}
            {field.type === "file" && typeof value === "string" && value ? (
              <p className="text-xs text-tag-green-foreground">Ready to upload: {value}</p>
            ) : null}
            {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
