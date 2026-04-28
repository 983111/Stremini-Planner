import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import {
  collection, query, where, onSnapshot,
  doc, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Plus, Settings2, ChevronRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// ── Status / Select Badge ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  "done":        "bg-emerald-100 text-emerald-700 border-emerald-200",
  "complete":    "bg-emerald-100 text-emerald-700 border-emerald-200",
  "completed":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "in progress": "bg-blue-100 text-blue-700 border-blue-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  "active":      "bg-blue-100 text-blue-700 border-blue-200",
  "to do":       "bg-zinc-100 text-zinc-600 border-zinc-200",
  "todo":        "bg-zinc-100 text-zinc-600 border-zinc-200",
  "not started": "bg-zinc-100 text-zinc-600 border-zinc-200",
  "blocked":     "bg-red-100 text-red-700 border-red-200",
  "cancelled":   "bg-red-100 text-red-600 border-red-200",
  "high":        "bg-red-100 text-red-700 border-red-200",
  "medium":      "bg-amber-100 text-amber-700 border-amber-200",
  "low":         "bg-zinc-100 text-zinc-600 border-zinc-200",
  "urgent":      "bg-orange-100 text-orange-700 border-orange-200",
  "review":      "bg-purple-100 text-purple-700 border-purple-200",
  "draft":       "bg-yellow-100 text-yellow-700 border-yellow-200",
  "published":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "archived":    "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function SelectBadge({ value, options, onChange }: {
  value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const colorClass = STATUS_COLORS[value.toLowerCase()] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-80 ${value ? colorClass : "text-zinc-400 border-dashed border-zinc-300 bg-transparent"}`}
      >
        {value || "Empty"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 min-w-[130px] bg-white border border-zinc-200 rounded-xl shadow-lg py-1 overflow-hidden">
            {["", ...options].map((opt) => (
              <button
                key={opt || "__empty"}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors text-left"
              >
                {opt ? (
                  <span className={`inline-flex px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[opt.toLowerCase()] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                    {opt}
                  </span>
                ) : (
                  <span className="text-zinc-400">Empty</span>
                )}
                {opt === value && <Check className="w-3 h-3 ml-auto text-zinc-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── DatabaseView ─────────────────────────────────────────────────────────────

export function DatabaseView() {
  const { pageId } = useParams();
  const { user } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [schema, setSchema] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const [isColDialogOpen, setIsColDialogOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("text");
  const [newColOptions, setNewColOptions] = useState("");

  useEffect(() => {
    if (!pageId || !user) return;
    const unsubPage = onSnapshot(doc(db, "pages", pageId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPage({ id: snap.id, ...data });
        try {
          const parsed = JSON.parse(data.schema || "[]");
          setSchema(Array.isArray(parsed) ? parsed : []);
        } catch { setSchema([]); }
      }
    });

    const q = query(
      collection(db, "records"),
      where("databaseId", "==", pageId),
      where("ownerId", "==", user.uid)
    );
    const unsubRecords = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecords(data.sort((a: any, b: any) => b.createdAt - a.createdAt));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "records"));

    return () => { unsubPage(); unsubRecords(); };
  }, [pageId, user]);

  useEffect(() => {
    if (!records.length || !schema.length) return;
    const statusCol = schema.find((col) => col.type === 'status');
    const dateCol = schema.find((col) => col.type === 'date');
    if (!statusCol || !dateCol) return;

    const today = new Date().toISOString().slice(0, 10);
    records.forEach((record) => {
      try {
        const props = JSON.parse(record.properties || '{}');
        const currentStatus = String(props[statusCol.key] || '').toLowerCase();
        const deadline = String(props[dateCol.key] || '');
        if (!deadline) return;
        if (deadline < today && !['done', 'complete', 'completed', 'overdue'].includes(currentStatus)) {
          updateRecordProp(record.id, record.properties, statusCol.key, 'Overdue');
        }
      } catch {
        // ignore malformed properties
      }
    });
  }, [records, schema]);

  const updateTitle = async (t: string) => {
    if (!pageId) return;
    setPage({ ...page, title: t });
    await updateDoc(doc(db, "pages", pageId), { title: t, updatedAt: serverTimestamp() });
  };

  const addRecord = async () => {
    if (!user || !pageId) return;
    const initProps: any = {};
    schema.forEach((col) => {
      initProps[col.key] = col.type === "select" || col.type === "status" ? (col.options?.[0] || "") : "";
    });
    await addDoc(collection(db, "records"), {
      databaseId: pageId, title: "",
      properties: JSON.stringify(initProps),
      blocks: "[]", ownerId: user.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  };

  const updateRecordTitle = async (id: string, title: string) =>
    updateDoc(doc(db, "records", id), { title, updatedAt: serverTimestamp() });

  const updateRecordProp = async (id: string, propsRaw: string, key: string, value: string) => {
    try {
      const props = JSON.parse(propsRaw || "{}");
      props[key] = value;
      await updateDoc(doc(db, "records", id), { properties: JSON.stringify(props), updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  };

  const patchLocalProp = (recordId: string, key: string, value: string) => {
    setRecords((prev) => prev.map((r) => {
      if (r.id !== recordId) return r;
      try {
        const p = JSON.parse(r.properties || "{}");
        p[key] = value;
        return { ...r, properties: JSON.stringify(p) };
      } catch { return r; }
    }));
  };

  const addColumn = async () => {
    if (!pageId || !newColName) return;
    const newSchema = [...schema, {
      key: newColName.toLowerCase().replace(/\s+/g, ""),
      name: newColName, type: newColType,
      options: (newColType === "select" || newColType === "status")
        ? newColOptions.split(",").map((o) => o.trim()).filter(Boolean)
        : [],
    }];
    await updateDoc(doc(db, "pages", pageId), { schema: JSON.stringify(newSchema), updatedAt: serverTimestamp() });
    setIsColDialogOpen(false);
    setNewColName(""); setNewColOptions("");
  };

  if (!page) return (
    <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
      Loading database…
    </div>
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-12 w-full flex-shrink-0 flex items-center justify-between px-6 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Workspace</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-700 font-medium">{page.title || "Untitled"}</span>
        </div>
        <button className="text-xs text-zinc-400 hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors">
          Updates
        </button>
      </header>

      <div className="overflow-y-auto flex-1">
        <div className="max-w-6xl mx-auto px-10 py-10">
          {/* Title */}
          <input
            className="w-full text-5xl font-bold tracking-tight text-zinc-900 mb-8 bg-transparent outline-none placeholder-zinc-200"
            placeholder="Untitled Database"
            value={page.title || ""}
            onChange={(e) => updateTitle(e.target.value)}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-4 text-sm">
              <button className="border-b-2 border-zinc-900 pb-2 text-zinc-900 font-medium">
                Table
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsColDialogOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 bg-white px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" /> Add Column
              </button>
              <button
                onClick={addRecord}
                className="flex items-center gap-1 text-xs font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Record
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70">
                  <th className="py-2.5 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-64 min-w-[220px] border-r border-zinc-100">
                    Name
                  </th>
                  {schema.map((col) => (
                    <th key={col.key} className="py-2.5 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider min-w-[150px] border-r border-zinc-100 last:border-0">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.length === 0 && (
                  <tr>
                    <td colSpan={schema.length + 1} className="py-12 text-center text-zinc-400 text-sm">
                      No records yet. Click <strong>New Record</strong> to add one.
                    </td>
                  </tr>
                )}
                {records.map((record) => {
                  let props: any = {};
                  try { props = JSON.parse(record.properties || "{}"); } catch {}
                  return (
                    <tr key={record.id} className="hover:bg-zinc-50/80 transition-colors group">
                      <td className="py-2 px-4 border-r border-zinc-100 font-medium text-zinc-900">
                        <input
                          className="w-full bg-transparent outline-none placeholder-zinc-300 focus:bg-white focus:ring-2 ring-purple-200 rounded-md px-2 py-1 -ml-2 transition-all text-sm"
                          value={record.title}
                          placeholder="Untitled"
                          onChange={(e) => {
                            setRecords((prev) =>
                              prev.map((r) => r.id === record.id ? { ...r, title: e.target.value } : r)
                            );
                          }}
                          onBlur={(e) => updateRecordTitle(record.id, e.target.value)}
                        />
                      </td>
                      {schema.map((col) => (
                        <td key={col.key} className="py-2 px-4 border-r border-zinc-100 last:border-0">
                          {col.type === "select" || col.type === "status" ? (
                            <SelectBadge
                              value={props[col.key] || ""}
                              options={col.options || []}
                              onChange={(v) => {
                                patchLocalProp(record.id, col.key, v);
                                updateRecordProp(record.id, record.properties, col.key, v);
                              }}
                            />
                          ) : col.type === "date" ? (
                            <input
                              type="date"
                              className="text-zinc-700 text-sm bg-transparent outline-none cursor-pointer hover:bg-zinc-100/80 px-2 py-1 rounded-md transition-colors"
                              value={props[col.key] || ""}
                              onChange={(e) => {
                                patchLocalProp(record.id, col.key, e.target.value);
                                updateRecordProp(record.id, record.properties, col.key, e.target.value);
                              }}
                            />
                          ) : col.type === "checkbox" ? (
                            <button
                              className="flex items-center justify-center w-5 h-5"
                              onClick={() => {
                                const cur = props[col.key] === "true" || props[col.key] === true;
                                patchLocalProp(record.id, col.key, String(!cur));
                                updateRecordProp(record.id, record.properties, col.key, String(!cur));
                              }}
                            >
                              {(props[col.key] === "true" || props[col.key] === true)
                                ? <Check className="w-4 h-4 text-purple-600" />
                                : <div className="w-4 h-4 rounded border-2 border-zinc-300" />
                              }
                            </button>
                          ) : col.type === "number" ? (
                            <input
                              type="number"
                              className="w-full text-zinc-700 text-sm bg-transparent outline-none focus:bg-white focus:ring-2 ring-purple-200 rounded-md px-2 py-1 -ml-2 placeholder-zinc-300 transition-all"
                              value={props[col.key] || ""}
                              onChange={(e) => patchLocalProp(record.id, col.key, e.target.value)}
                              onBlur={(e) => updateRecordProp(record.id, record.properties, col.key, e.target.value)}
                            />
                          ) : (
                            <input
                              className="w-full text-zinc-700 text-sm bg-transparent outline-none focus:bg-white focus:ring-2 ring-purple-200 rounded-md px-2 py-1 -ml-2 placeholder-zinc-300 transition-all"
                              placeholder="Empty"
                              value={props[col.key] || ""}
                              onChange={(e) => patchLocalProp(record.id, col.key, e.target.value)}
                              onBlur={(e) => updateRecordProp(record.id, record.properties, col.key, e.target.value)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {records.length > 0 && (
            <button
              onClick={addRecord}
              className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add a record
            </button>
          )}
        </div>
      </div>

      {/* Add Column Dialog */}
      <Dialog open={isColDialogOpen} onOpenChange={setIsColDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Name</label>
              <Input value={newColName} onChange={(e) => setNewColName(e.target.value)} placeholder="e.g. Priority" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Column Type</label>
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="checkbox">Checkbox</option>
                <option value="select">Select</option>
                <option value="status">Status</option>
                <option value="date">Date</option>
              </select>
            </div>
            {(newColType === "select" || newColType === "status") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Options (comma separated)</label>
                <Input
                  value={newColOptions}
                  onChange={(e) => setNewColOptions(e.target.value)}
                  placeholder="e.g. To Do, In Progress, Done"
                />
              </div>
            )}
            <Button className="w-full" onClick={addColumn} disabled={!newColName}>
              Add Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
