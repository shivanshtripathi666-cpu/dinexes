"use client";
import { Mark } from "@/components/brand";
import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Mark className="size-12" />
      <h1 className="display mt-6 text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-muted">Please check your internet connection and try again.</p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
