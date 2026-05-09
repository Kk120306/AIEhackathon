import Link from "next/link";
import Image from "next/image";

// ── Feature cards ──────────────────────────────────────────────────────────────

const features = [
  {
    icon: "🎙️",
    title: "Voice-first learning",
    description:
      "Talk to Friday naturally, hands-free. No typing, no clicking — just ask your question and listen to a clear, exam-ready explanation.",
  },
  {
    icon: "📊",
    title: "Live visual tools",
    description:
      "Graph transformations in Desmos, spin 3-D molecules in MolView, and see step-by-step breakdowns — all triggered automatically mid-conversation.",
  },
  {
    icon: "🧪",
    title: "IB & A-Level syllabus",
    description:
      "Maths, Physics, and Chemistry topics mapped to the IB and Singapore A-Level curricula. Friday knows the marking schemes, not just the concepts.",
  },
];

// ── Steps ──────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Open a session",
    description: "Hit Start Learning and grant microphone access. No account required.",
  },
  {
    number: "02",
    title: "Ask your question",
    description: "Speak naturally. Friday transcribes, thinks, and answers in seconds.",
  },
  {
    number: "03",
    title: "See it visualised",
    description: "Graphs, molecules, or worked steps appear beside Friday's spoken answer.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image src="/friday-logo.png" alt="Friday logo" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-semibold text-white tracking-tight">Friday</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Parent Dashboard
            </Link>
            <Link
              href="/learn"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Start Learning
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-28 text-center">
        {/* Subtle glow behind headline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        >
          <div className="h-[420px] w-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-800/60 bg-indigo-950/60 px-3.5 py-1 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Voice-first AI tutor for IB &amp; Singapore A-Levels
          </span>

          <h1 className="mt-6 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Your child&apos;s personal{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              AI tutor
            </span>
            <br />
            available 24/7
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
            Friday listens, explains, and visualises — hands-free. Ask any Maths, Physics,
            or Chemistry question and get a clear, syllabus-aligned answer in seconds.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all hover:bg-indigo-500 hover:shadow-indigo-800/50"
            >
              Start Learning
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Parent Dashboard
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600">No account required · Free to try</p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Why Friday
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Built for how students actually learn
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-7 transition-colors hover:border-zinc-700"
            >
              <span className="text-3xl" aria-hidden>
                {f.icon}
              </span>
              <h3 className="mt-5 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800 bg-zinc-900/30 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              From question to answer in seconds
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col gap-4">
                <span className="text-4xl font-bold tabular-nums text-zinc-800">
                  {s.number}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl rounded-2xl border border-indigo-900/60 bg-indigo-950/30 px-8 py-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to start learning?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-400">
            No sign-up needed. Just open a session and start talking to Friday.
          </p>
          <Link
            href="/learn"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all hover:bg-indigo-500"
          >
            Start Learning
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/friday-logo.png" alt="Friday logo" width={24} height={24} className="rounded-md opacity-70" />
            <span className="text-sm font-semibold text-zinc-400">Friday</span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-zinc-500">
            <Link href="/learn" className="hover:text-zinc-300 transition-colors">
              Learning Platform
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Parent Dashboard
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
