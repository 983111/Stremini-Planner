import { Plus, Sparkles } from "lucide-react";

export function Dashboard() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-zinc-500 bg-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 shadow-sm mb-6">
        <Sparkles className="h-8 w-8 text-zinc-400" />
      </div>
      <h2 className="text-2xl tracking-tight font-semibold text-zinc-900 mb-2">Welcome to your Workspace</h2>
      <p className="text-sm max-w-sm text-center text-zinc-500 leading-relaxed">
        Select an existing document from the sidebar, or create a new database using AI to track your tasks.
      </p>
    </div>
  );
}
