type ToolEmbedProps = {
  title: string;
  url: string;
};

export default function ToolEmbed({ title, url }: ToolEmbedProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">{title}</h3>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-400"
        >
          Open full screen
        </a>
      </div>

      <iframe
        src={url}
        className="h-[500px] w-full rounded-xl border border-gray-700 bg-white"
      />
    </div>
  );
}