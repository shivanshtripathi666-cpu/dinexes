import { requireMember } from "@/lib/server/auth";
import { HttpError, handle, ok } from "@/lib/server/http";
import { saveImage } from "@/lib/server/uploads";

export const dynamic = "force-dynamic";

/** Image upload (logo, cover, dish photo). multipart/form-data with fields "kind" and "file". */
export const POST = handle(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, "Please choose an image.");
  const kind = form.get("kind");
  if (kind !== "logo" && kind !== "cover" && kind !== "dish") throw new HttpError(400, "Invalid image type.");
  const m = await requireMember(req, kind === "dish" ? "menu.edit" : "settings.edit");
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Please choose an image.");
  const url = await saveImage(m.rid, kind, file);
  return ok({ url }, 201);
});
