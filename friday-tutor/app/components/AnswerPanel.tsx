import type { TutorResponse } from "../page";

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getToolLabel(name: string) {
  if (name === "show_desmos_graph") return "Graph";
  if (name === "show_molecule_3d") return "Molecule";
  if (name === "show_steps_breakdown") return "Worked solution";
  return "Visual aid";
}

export default function AnswerPanel({
  question,
  response,
}: {
  question: string;
  response: TutorResponse | null;
}) {
  const toolCall = response?.tool_call;
  const steps = getStringArray(toolCall?.args.steps);
  const topic =
    typeof toolCall?.args.topic === "string" ? toolCall.args.topic : "";

  return (
    <div className="mt-6 bg-gray-900 p-4 rounded-xl">
      {question && (
        <>
          <p className="text-gray-400">You asked:</p>
          <p className="mb-4">{question}</p>
        </>
      )}

      {response && (
        <>
          <p className="text-blue-400 font-semibold">Friday says</p>

          <p className="mt-2">{response.spoken_answer}</p>

          {steps.length > 0 && (
            <div className="mt-4 rounded-xl border border-gray-800 bg-black/30 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-300">
                {topic || "Worked steps"}
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-200">
                {steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {toolCall && steps.length === 0 && (
            <p className="mt-4 rounded-xl border border-gray-800 bg-black/30 p-3 text-sm text-gray-300">
              Visual aid queued: {getToolLabel(toolCall.name)}
            </p>
          )}
        </>
      )}

      {!response && (
        <p className="text-sm text-gray-500">
          Friday&apos;s answer will appear here after you ask a question.
        </p>
      )}
    </div>
  );
}
