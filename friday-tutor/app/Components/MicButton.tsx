"use client";

type MicButtonProps = {
  setQuestion: (value: string) => void;
  askFriday: (question: string) => void;
  setStatus: (status: "idle" | "listening" | "thinking" | "speaking" | "error") => void;
};

export default function MicButton({
  setQuestion,
  askFriday,
  setStatus,
}: MicButtonProps) {
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-SG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      askFriday(transcript);
    };

    recognition.onerror = () => {
      setStatus("error");
    };

    recognition.onend = () => {
      setStatus("idle");
    };

    recognition.start();
  };

  return (
    <button
      onClick={startListening}
      className="rounded-xl bg-green-500 px-6 py-3 font-bold text-black hover:bg-green-400"
    >
      🎤 Ask Friday
    </button>
  );
}