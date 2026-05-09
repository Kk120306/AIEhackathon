import type { FridayResponse } from "../page";
import ChemMechanism from "./ChemMechanism";
import ForceDiagram from "./ForceDiagram";
import ToolEmbed from "./ToolEmbed";

type VisualizationPanelProps = {
  response: FridayResponse | null;
};

export default function VisualizationPanel({ response }: VisualizationPanelProps) {
  if (!response) {
    return (
      <div className="rounded-xl border border-gray-800 bg-black p-6 text-gray-400">
        Ask Friday a question to see the visual explanation here.
      </div>
    );
  }

  if (!response.needs_visualization || response.visualization_tool === "none") {
    return (
      <div className="rounded-xl border border-gray-800 bg-black p-6">
        <p className="text-gray-300">
          No visualization needed. Friday can explain this concept verbally.
        </p>
      </div>
    );
  }

  if (response.visualization_tool === "desmos") {
    return (
      <ToolEmbed
        title="Desmos Graph Visualizer"
        url={response.visualization_url || "https://www.desmos.com/calculator"}
      />
    );
  }

  if (response.visualization_tool === "phet") {
    return (
      <ToolEmbed
        title="PhET Interactive Simulation"
        url={response.visualization_url || "https://phet.colorado.edu/"}
      />
    );
  }

  if (response.visualization_tool === "molview") {
    return (
      <ToolEmbed
        title="MolView Molecular Visualizer"
        url={response.visualization_url || "https://molview.org/"}
      />
    );
  }

  if (response.visualization_tool === "force_diagram") {
    return <ForceDiagram data={response.diagram_data} />;
  }

  if (response.visualization_tool === "chem_mechanism") {
    return <ChemMechanism steps={response.display_steps} />;
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-black p-6 text-gray-400">
      Visualization type not supported yet.
    </div>
  );
}