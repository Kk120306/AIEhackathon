import type { TutorResponse } from "../page";
import DesmosPanel from "./DesmosPanel";

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getMoleculeUrl(args: Record<string, unknown>) {
  const query =
    getString(args.smiles) ||
    getString(args.pubchem_cid) ||
    getString(args.molecule_name);

  return `https://molview.org/?q=${encodeURIComponent(query)}`;
}

export default function VisualizationPanel({
  response,
}: {
  response: TutorResponse | null;
}) {
  const toolCall = response?.tool_call;

  if (!toolCall) {
    return (
      <div className="bg-gray-900 p-4 rounded-xl">
        <p className="text-gray-400">
          Ask for a graph, molecule, or worked solution and Friday will place it
          here.
        </p>
      </div>
    );
  }

  if (toolCall.name === "show_desmos_graph") {
    const expressions = getStringArray(toolCall.args.expressions);
    const explanation = getString(toolCall.args.explanation);

    return (
      <div className="space-y-4">
        <DesmosPanel expressions={expressions} />

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          {explanation && <p className="mb-3 text-gray-300">{explanation}</p>}
          <div className="flex flex-wrap gap-2">
            {expressions.map((expression) => (
              <code
                key={expression}
                className="rounded-lg border border-blue-900 bg-blue-950/50 px-3 py-2 text-sm text-blue-100"
              >
                {expression}
              </code>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (toolCall.name === "show_molecule_3d") {
    const moleculeName = getString(toolCall.args.molecule_name);
    const smiles = getString(toolCall.args.smiles);
    const pubchemCid = getString(toolCall.args.pubchem_cid);

    return (
      <div className="space-y-4">
        <iframe
          title={`${moleculeName || "Molecule"} in MolView`}
          src={getMoleculeUrl(toolCall.args)}
          className="h-[500px] w-full rounded-xl border border-gray-800 bg-gray-900"
        />

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          <p className="font-semibold text-blue-300">
            {moleculeName || "Molecule viewer"}
          </p>
          {smiles && <p className="mt-2">SMILES: {smiles}</p>}
          {pubchemCid && <p className="mt-1">PubChem CID: {pubchemCid}</p>}
        </div>
      </div>
    );
  }

  if (toolCall.name === "show_steps_breakdown") {
    const topic = getString(toolCall.args.topic) || "Worked solution";
    const steps = getStringArray(toolCall.args.steps);

    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <p className="mb-4 text-lg font-semibold text-blue-300">{topic}</p>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-black">
                {index + 1}
              </span>
              <span className="pt-1 text-gray-200">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-sm text-gray-400">Unsupported tool call</p>
      <pre className="mt-3 overflow-auto rounded-lg bg-black p-3 text-xs text-gray-300">
        {JSON.stringify(toolCall, null, 2)}
      </pre>
    </div>
  );
}
