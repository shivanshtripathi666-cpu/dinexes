import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { rateOrder } from "@/lib/server/ratings";
import { int, str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Public: a guest rates the dishes of their served order (1 to 5 stars each). */
export const POST = handle(async (req: Request) => {
  const b = await readJson(req);
  if (!Array.isArray(b.ratings) || b.ratings.length === 0 || b.ratings.length > 30) throw new HttpError(400, "Please rate at least one dish.");
  const ratings = (b.ratings as { dishId?: unknown; stars?: unknown }[]).map((r) => {
    if (typeof r?.dishId !== "string" || !/^[A-Za-z0-9]{6,40}$/.test(r.dishId)) throw new HttpError(400, "Invalid dish.");
    return { dishId: r.dishId, stars: int(r.stars, "Stars", 1, 5) };
  });
  await rateOrder(str(b.token, "Order", { max: 40 }), ratings, str(b.comment, "Comment", { max: 300, optional: true }));
  return ok();
});
