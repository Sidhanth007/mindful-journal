export default function AppLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded-md bg-border" />
      <div className="h-24 rounded-xl bg-border/70" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-xl bg-border/70" />
        <div className="h-24 rounded-xl bg-border/70" />
        <div className="h-24 rounded-xl bg-border/70" />
        <div className="h-24 rounded-xl bg-border/70" />
      </div>
      <div className="h-40 rounded-xl bg-border/70" />
    </div>
  );
}
