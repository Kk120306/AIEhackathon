export type Session = {
  _id: string;
  studentName: string;
  startTime: number;
  endTime?: number;
  topics: string[];
  isActive: boolean;
};

export type Message = {
  _id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  topicTag?: string;
};

export type Progress = {
  _id: string;
  sessionId: string;
  topic: string;
  correctAnswers: number;
  totalQuestions: number;
  struggledTopics: string[];
};

export type AggregatedTopicProgress = {
  topic: string;
  accuracy: number | null;
  totalQuestions: number;
  struggledTopics: string[];
};
