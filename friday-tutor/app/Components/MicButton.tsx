"use client";

export default function MicButton({
  setQuestion,
  askBackend,
  setStatus,
}: any) {
  const startListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      askBackend(transcript);
    };

    recognition.start();
  };

  return (
    <button
      onClick={startListening}
      className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl text-black font-bold"
    >
      🎤 Ask Friday
    </button>
  );
}