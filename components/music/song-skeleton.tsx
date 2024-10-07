export const SongSkeleton = () => {
  return (
    <div className="rounded-xl border bg-zinc-950 p-4 text-black cursor-pointer hover:shadow-lg transition-shadow duration-300">
      <div className="w-full h-48 bg-zinc-800 rounded-md mb-4"></div>
      <div className="w-3/4 h-6 bg-zinc-700 rounded-md mb-2"></div>
      <div className="w-1/2 h-4 bg-zinc-700 rounded-md"></div>
    </div>
  );
}
