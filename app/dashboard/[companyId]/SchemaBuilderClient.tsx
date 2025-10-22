"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type FieldType = "text" | "number" | "select" | "checkbox";

export type SchemaField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select
  placeholder?: string;
};

export default function SchemaBuilderClient({
  companyId,
  initialSchema,
}: {
  companyId: string;
  initialSchema: unknown;
}) {
  const parsed = useMemo(() => {
    if (initialSchema && typeof initialSchema === "object") return initialSchema as any;
    return { fields: [] as SchemaField[] };
  }, [initialSchema]);

  const [fields, setFields] = useState<SchemaField[]>(() => {
    const maybe = Array.isArray((parsed as any).fields) ? (parsed as any).fields : [];
    return maybe.map((f: any) => ({
      key: String(f.key ?? ""),
      label: String(f.label ?? f.key ?? ""),
      type: (f.type as FieldType) ?? "text",
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.map(String) : undefined,
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
    }));
  });

  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function addField() {
    setFields((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: "New Field", type: "text", required: false },
    ]);
  }

  function updateField(index: number, updates: Partial<SchemaField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function normalize(): { fields: SchemaField[] } {
    const seen = new Set<string>();
    const normalized: SchemaField[] = [];
    for (const f of fields) {
      const key = f.key.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const base: SchemaField = {
        key,
        label: f.label?.trim() || key,
        type: f.type ?? "text",
        required: Boolean(f.required),
      };
      if (f.placeholder) base.placeholder = f.placeholder;
      if (f.type === "select") {
        const opts = (f.options ?? []).map((o) => String(o).trim()).filter(Boolean);
        if (opts.length > 0) base.options = opts;
      }
      normalized.push(base);
    }
    return { fields: normalized };
  }

  async function onSave() {
    setMessage(null);
    const body = normalize();
    startSaving(async () => {
      const res = await fetch(`/api/schema/${companyId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schema: body }),
        cache: "no-store",
      });
      if (!res.ok) {
        setMessage("Failed to save. Check your access and try again.");
        return;
      }
      setMessage("Saved.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Custom Post Fields</h3>
        <button
          type="button"
          onClick={addField}
          className="px-3 py-1.5 rounded bg-gray-100 border"
        >
          + Add field
        </button>
      </div>

      <div className="space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-gray-500">No fields yet. Click “Add field”.</p>
        )}

        {fields.map((f, i) => (
          <div key={i} className="border rounded p-3 grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Key</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={f.key}
                onChange={(e) => updateField(i, { key: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Label</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Type</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={f.type}
                onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <input
                id={`req_${i}`}
                type="checkbox"
                checked={Boolean(f.required)}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              <label htmlFor={`req_${i}`} className="text-sm">Required</label>
            </div>
            {f.type === "select" ? (
              <div className="md:col-span-6">
                <label className="text-xs text-gray-500">Options (one per line)</label>
                <textarea
                  className="w-full border rounded px-2 py-1 h-20"
                  value={(f.options ?? []).join("\n")}
                  onChange={(e) => updateField(i, { options: e.target.value.split("\n") })}
                />
              </div>
            ) : (
              <div className="md:col-span-6">
                <label className="text-xs text-gray-500">Placeholder (optional)</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={f.placeholder ?? ""}
                  onChange={(e) => updateField(i, { placeholder: e.target.value })}
                />
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => removeField(i)}
                className="text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save schema"}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </div>
  );
}


