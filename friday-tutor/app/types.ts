export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type TutorToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type TutorResponse = {
  spoken_answer: string;
  display_answer?: string;
  tool_call?: TutorToolCall;
  topic?: string;
  is_correct?: boolean;
  follow_up_questions?: string[];
};

export type AppStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";
