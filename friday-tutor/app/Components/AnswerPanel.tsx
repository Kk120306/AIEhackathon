import type { TutorResponse } from "../page";

export default function AnswerPanel({
  question,
  response,
}: {
  question: string;
  response: TutorResponse | null;
}) {
  if (!question && !response) return null;

  return (
    <div className="mt-6 rounded-xl bg-gray-900 p-4">
      {question && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            You said
          </p>
          <p className="mt-1 mb-4 text-gray-200">{question}</p>
        </>
      )}

      {response && (
        <>
          {response.topic && (
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              {response.topic}
            </p>
          )}
          <p className="mt-1 text-white">{response.spoken_answer}</p>

          {typeof response.is_correct === "boolean" && (
            <p
              className={`mt-3 text-sm font-semibold ${
                response.is_correct ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {response.is_correct ? "✓ Correct" : "Not quite — keep going!"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
