import type { FridayResponse } from "../page";

type AnswerPanelProps = {
  question: string;
  response: FridayResponse | null;
};

export default function AnswerPanel({ question, response }: AnswerPanelProps) {
  return (
    <div className="mt-6 rounded-xl border border-gray-800 bg-black p-5">
      {question && (
        <div className="mb-5">
          <p className="text-sm text-gray-400">Student asked</p>
          <p className="mt-1 text-gray-100">{question}</p>
        </div>
      )}

      {!response && (
        <p className="text-gray-500">
          Friday’s explanation will appear here.
        </p>
      )}

      {response && (
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-semibold text-blue-300">
              {response.subject}
            </span>

            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-sm font-semibold text-purple-300">
              {response.topic}
            </span>
          </div>

          <p className="leading-relaxed text-gray-100">
            {response.spoken_answer}
          </p>

          {response.display_steps?.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-gray-300">
                Step-by-step breakdown
              </p>

              <ol className="list-decimal space-y-2 pl-5 text-gray-300">
                {response.display_steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {response.exam_tip && (
            <div className="mt-5 rounded-xl border border-green-700 bg-green-950/40 p-4">
              <p className="text-sm font-semibold text-green-300">Exam tip</p>
              <p className="mt-1 text-green-100">{response.exam_tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}