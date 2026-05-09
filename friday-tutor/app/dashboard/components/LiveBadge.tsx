export default function LiveBadge({
  isLive,
  studentName,
  onWatch,
}: {
  isLive: boolean;
  studentName: string;
  onWatch: () => void;
}) {
  if (!isLive) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-green-950 border border-green-800 px-3 py-1 text-sm font-medium text-green-300">
      <span className="animate-pulse bg-green-500 h-2 w-2 rounded-full" />
      <span>LIVE — {studentName}</span>
      <button
        onClick={onWatch}
        className="text-green-400 underline text-xs ml-1"
      >
        Watch
      </button>
    </div>
  );
}
