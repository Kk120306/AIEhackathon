export default function VisualizationPanel({ response }: any) {
  if (!response || !response.needs_visualization) {
    return (
      <div className="bg-gray-900 p-4 rounded-xl">
        <p>No visualization needed</p>
      </div>
    );
  }

  if (response.visualization_tool === "desmos") {
    return (
      <iframe
        src={response.visualization_url}
        className="w-full h-[500px] rounded-xl"
      />
    );
  }

  if (response.visualization_tool === "phet") {
    return (
      <iframe
        src={response.visualization_url}
        className="w-full h-[500px] rounded-xl"
      />
    );
  }

  if (response.visualization_tool === "molview") {
    return (
      <iframe
        src={response.visualization_url}
        className="w-full h-[500px] rounded-xl"
      />
    );
  }

  return null;
}