/** Shown while lazy route chunks load. */
export function PageFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center px-6">
      <div className="text-sm font-semibold opacity-60">Loading…</div>
    </div>
  );
}
