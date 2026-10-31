"use client";
import { orderBy } from "firebase/firestore";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { api, errorText } from "@/lib/api";
import { useLiveCollection } from "@/lib/firebase/hooks";
import { mapCategory, mapDish } from "@/lib/mappers";
import { formatINR, paiseToRupeesInput } from "@/lib/money";
import type { Category, Dish } from "@/lib/types";
import { ImagePicker } from "./image-picker";
import { Modal } from "./modal";
import { Alert, Button, Card, EmptyState, Field, Input, Select, Spinner, Textarea, Toggle, VegMark } from "./ui";

export function useMenu(rid: string) {
  const cats = useLiveCollection(`restaurants/${rid}/categories`, [orderBy("sort")], "sort", mapCategory);
  const dishes = useLiveCollection(`restaurants/${rid}/dishes`, [orderBy("sort")], "sort", mapDish);
  return { categories: cats.data, dishes: dishes.data, loading: cats.loading || dishes.loading, error: cats.error || dishes.error };
}

type DishForm = { id?: string; categoryId: string; name: string; description: string; price: string; veg: boolean; photoUrl: string };

export function MenuManager({ rid, canEdit = true }: { rid: string; canEdit?: boolean }) {
  const { categories, dishes, loading, error } = useMenu(rid);
  const [newCat, setNewCat] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<DishForm | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const byCat = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const d of dishes) m.set(d.categoryId, [...(m.get(d.categoryId) || []), d]);
    return m;
  }, [dishes]);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr("");
    try {
      await fn();
      return true;
    } catch (e) {
      setErr(errorText(e));
      return false;
    } finally {
      setBusy("");
    }
  }

  async function move(c: Category, dir: -1 | 1) {
    const i = categories.findIndex((x) => x.id === c.id);
    const other = categories[i + dir];
    if (!other) return;
    await run(`move-${c.id}`, async () => {
      await api("/api/menu/categories", { method: "PATCH", body: { id: c.id, sort: other.sort } });
      await api("/api/menu/categories", { method: "PATCH", body: { id: other.id, sort: c.sort } });
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || err) && <Alert tone="bad">{error || err}</Alert>}
      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newCat.trim()) return;
            if (await run("cat", () => api("/api/menu/categories", { method: "POST", body: { name: newCat } }))) setNewCat("");
          }}
        >
          <Input aria-label="New category name" placeholder="New category, e.g. Starters" value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={40} />
          <Button type="submit" variant="dark" loading={busy === "cat"}>
            <Plus className="size-4" /> Add category
          </Button>
        </form>
      )}

      {categories.length === 0 && (
        <EmptyState icon={<UtensilsCrossed className="size-7" />} title="Your menu is empty">
          Start with a category such as “Main course” or “Drinks”, then add dishes to it.
        </EmptyState>
      )}

      {categories.map((c, i) => {
        const list = byCat.get(c.id) || [];
        return (
          <Card key={c.id} className="overflow-hidden" data-testid={`category-${c.name}`}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ivory/60 px-4 py-3">
              <h3 className="mr-auto font-semibold">
                {c.name} <span className="ml-1 text-sm font-normal text-muted">{list.length} dishes</span>
              </h3>
              {canEdit && (
                <>
                  <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0 || !!busy} onClick={() => move(c, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === categories.length - 1 || !!busy} onClick={() => move(c, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRenaming({ id: c.id, name: c.name })}>
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${c.name}`}
                    loading={busy === `del-${c.id}`}
                    onClick={() => run(`del-${c.id}`, () => api("/api/menu/categories", { method: "DELETE", body: { id: c.id } }))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button size="sm" onClick={() => setEdit({ categoryId: c.id, name: "", description: "", price: "", veg: true, photoUrl: "" })}>
                    <Plus className="size-4" /> Add dish
                  </Button>
                </>
              )}
            </div>
            {list.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No dishes in this category yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3" data-testid={`dish-${d.name}`}>
                    {d.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photoUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="size-12 shrink-0 rounded-lg bg-ivory" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <VegMark veg={d.veg} />
                        <span className="truncate">{d.name}</span>
                      </p>
                      <p className="text-sm text-muted">
                        {formatINR(d.pricePaise)}
                        {d.ratingCount > 0 && <span className="ml-2 font-semibold text-amber-deep">★ {d.ratingAvg.toFixed(1)} ({d.ratingCount})</span>}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-muted">
                      <span className="hidden sm:inline">{d.available ? "Available" : "Sold out"}</span>
                      <Toggle
                        label={`${d.name} available`}
                        checked={d.available}
                        disabled={busy === `av-${d.id}`}
                        onChange={(v) => run(`av-${d.id}`, () => api("/api/menu/dishes", { method: "PATCH", body: { id: d.id, available: v } }))}
                      />
                    </label>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit ${d.name}`}
                        onClick={() =>
                          setEdit({ id: d.id, categoryId: d.categoryId, name: d.name, description: d.description, price: paiseToRupeesInput(d.pricePaise), veg: d.veg, photoUrl: d.photoUrl })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename category">
        {renaming && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("rename", () => api("/api/menu/categories", { method: "PATCH", body: { id: renaming.id, name: renaming.name } }))) setRenaming(null);
            }}
          >
            <Input aria-label="Category name" value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} maxLength={40} />
            <Button type="submit" loading={busy === "rename"}>
              Save
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit dish" : "Add dish"}>
        {edit && (
          <DishEditor
            value={edit}
            categories={categories}
            onCancel={() => setEdit(null)}
            onSave={async (v) => {
              const body = { ...v, price: v.price };
              const ok = await run("dish", () =>
                v.id ? api("/api/menu/dishes", { method: "PATCH", body }) : api("/api/menu/dishes", { method: "POST", body }),
              );
              if (ok) setEdit(null);
            }}
            onDelete={
              edit.id
                ? async () => {
                    if (await run("dish", () => api("/api/menu/dishes", { method: "DELETE", body: { id: edit.id } }))) setEdit(null);
                  }
                : undefined
            }
            busy={busy === "dish"}
            error={err}
          />
        )}
      </Modal>
    </div>
  );
}

function DishEditor({
  value,
  categories,
  onSave,
  onCancel,
  onDelete,
  busy,
  error,
}: {
  value: DishForm;
  categories: Category[];
  onSave: (v: DishForm) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
  error: string;
}) {
  const [v, setV] = useState(value);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
    >
      <Field label="Dish name" htmlFor="d-name">
        <Input id="d-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required maxLength={60} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (₹)" htmlFor="d-price">
          <Input id="d-price" inputMode="decimal" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} required placeholder="180" />
        </Field>
        <Field label="Category" htmlFor="d-cat">
          <Select id="d-cat" value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="d-desc" hint="Optional. One or two lines.">
        <Textarea id="d-desc" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={240} className="min-h-20" />
      </Field>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="veg" checked={v.veg} onChange={() => setV({ ...v, veg: true })} className="accent-[#2e7a57]" /> <VegMark veg /> Veg
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="veg" checked={!v.veg} onChange={() => setV({ ...v, veg: false })} className="accent-[#b2412f]" /> <VegMark veg={false} /> Non-veg
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Photo</p>
        <ImagePicker kind="dish" value={v.photoUrl} onChange={(url) => setV({ ...v, photoUrl: url })} label="Add photo" />
      </div>
      {error && <Alert tone="bad">{error}</Alert>}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={busy}>
          {v.id ? "Save dish" : "Add dish"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete && (
          <Button type="button" variant="ghost" className="ml-auto text-bad" onClick={onDelete}>
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
      </div>
    </form>
  );
}
