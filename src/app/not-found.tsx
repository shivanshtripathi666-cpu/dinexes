import Link from "next/link";
import { Mark } from "@/components/brand";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Mark className="size-12" />
      <h1 className="display mt-6 text-3xl font-semibold">This page is not available</h1>
      <p className="mt-2 max-w-sm text-muted">If you scanned a QR code on a table, it may have been replaced. Please ask the staff for help.</p>
      <Link href="/" className={buttonClass("dark", "md", "mt-6")}>
        Go to home page
      </Link>
    </div>
  );
}
