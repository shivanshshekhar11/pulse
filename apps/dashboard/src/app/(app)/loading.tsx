import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center rounded-lg border border-dashed border-zinc-800/50">
      <div className="flex flex-col items-center space-y-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    </div>
  );
}
