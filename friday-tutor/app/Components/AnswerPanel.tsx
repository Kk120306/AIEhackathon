export default function AnswerPanel({ question, response }: any) {
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
          <p className="text-blue-400 font-semibold">
            {response.subject} — {response.topic}
          </p>

          <p className="mt-2">{response.spoken_answer}</p>

          {response.display_steps && (
            <ul className="mt-4 list-disc pl-5">
              {response.display_steps.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          )}

          {response.exam_tip && (
            <p className="mt-4 text-green-400">
              💡 {response.exam_tip}
            </p>
          )}
        </>
      )}
    </div>
  );
}
