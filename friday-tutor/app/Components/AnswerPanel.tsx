"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { TutorResponse } from "../types";

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
          <div className="mt-1 text-white prose prose-invert prose-sm max-w-none
            [&_.katex]:text-white
            [&_p]:leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0
            [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1
            [&_ol]:pl-5 [&_ol]:mb-3
            [&_strong]:font-semibold [&_strong]:text-white
            [&_code]:bg-zinc-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-indigo-300 [&_code]:text-xs">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {response.display_answer ?? response.spoken_answer}
            </ReactMarkdown>
          </div>

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
