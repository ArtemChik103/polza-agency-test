export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="h-10 w-64 bg-zinc-800 rounded-lg" />
      <div className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl" />
      <div className="h-96 bg-zinc-900 border border-zinc-800 rounded-xl" />
    </div>
  );
}
