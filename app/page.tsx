"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const [theme, setTheme] = useState("");
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState("");
  const [dailyTime, setDailyTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [curriculum, setCurriculum] = useState<any>(null);

  if (curriculum) {
  return (
    <main className="min-h-screen bg-[#09090b] text-white px-6 py-12">
      <div className="mx-auto max-w-5xl">

        <div className="mb-12">
          <p className="mb-3 text-sm text-zinc-500">
            YOUR MONTH
          </p>

          <h1 className="text-5xl font-semibold tracking-tight">
            {curriculum.theme}
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-zinc-400">
            {curriculum.goal}
          </p>
        </div>

        <div className="space-y-8">
          {curriculum.modules.map(
            (module: any, moduleIndex: number) => (
              <section
                key={moduleIndex}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="mb-6">
                  <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">
                    Module {moduleIndex + 1}
                  </p>

                  <h2 className="text-2xl font-medium">
                    {module.title}
                  </h2>

                  <p className="mt-2 text-zinc-400">
                    {module.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {module.lessons.map((lesson: any) => (
                    <div
                      key={lesson.day}
                      className="flex items-center gap-5 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-black">
                        {lesson.day}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium">
                          {lesson.title}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {lesson.description}
                        </p>
                      </div>

                      <div className="text-right text-xs text-zinc-500">
                        <div>
                          {lesson.estimatedMinutes} min
                        </div>

                        <div className="mt-1 capitalize">
                          {lesson.difficulty}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          )}
        </div>

      </div>
    </main>
  );
}

  const buildMonth = async () => {
  setLoading(true);
  setError("");

  try {
    const response = await fetch("/api/generate-curriculum", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        theme,
        level,
        dailyTime,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    console.log("GENERATED CURRICULUM:", data);
    setCurriculum(data);

  } catch (error) {
    console.error(error);
    setError("Something went wrong while building your month.");
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">

        {/* Header */}
        <header className="flex items-center justify-between py-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
              1
            </div>

            <span className="text-lg font-semibold tracking-tight">
              one thing
            </span>
          </div>

          <div className="text-sm text-white/40">
            One month. One obsession.
          </div>
        </header>

        {/* Hero */}
        <section className="flex flex-1 items-center justify-center py-20">
          <div className="w-full max-w-3xl text-center">

            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60">
                <Sparkles className="h-4 w-4" />
                Your AI-powered learning month
              </div>

              <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
                Master
                <span className="block text-white/40">
                  one thing.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/50">
                Choose one subject every month. Your AI builds the journey,
                adapts to you, and turns 30 days into something you actually
                remember.
              </p>
            </motion.div>

            {/* Onboarding Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mx-auto mt-14 max-w-xl"
            >
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-2xl">

                {/* STEP 1 — THEME */}
                {step === 1 && (
                  <div>
                    <p className="text-sm font-medium text-white/40">
                      STEP 1 OF 3
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold">
                      What do you want to master?
                    </h2>

                    <input
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      type="text"
                      placeholder="e.g. Financial Literacy"
                      className="mt-6 w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-base text-white outline-none placeholder:text-white/25 focus:border-white/30"
                    />

                    <button
                      disabled={!theme.trim()}
                      onClick={() => setStep(2)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2 — LEVEL */}
                {step === 2 && (
                  <div>
                    <p className="text-sm font-medium text-white/40">
                      STEP 2 OF 3
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold">
                      What's your current level?
                    </h2>

                    <div className="mt-6 grid gap-3">
                      {[
                        "Complete beginner",
                        "Some knowledge",
                        "Intermediate",
                      ].map((option) => (
                        <button
                          key={option}
                          onClick={() => setLevel(option)}
                          className={`rounded-2xl border px-5 py-4 text-left transition ${
                            level === option
                              ? "border-white/40 bg-white/10"
                              : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={!level}
                      onClick={() => setStep(3)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* STEP 3 — DAILY TIME */}
                {step === 3 && (
                  <div>
                    <p className="text-sm font-medium text-white/40">
                      STEP 3 OF 3
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold">
                      How much time can you give this?
                    </h2>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {[
                        "10 min",
                        "20 min",
                        "30 min",
                        "45 min",
                        "60+ min",
                      ].map((option) => (
                        <button
                          key={option}
                          onClick={() => setDailyTime(option)}
                          className={`rounded-2xl border px-5 py-4 transition ${
                            dailyTime === option
                              ? "border-white/40 bg-white/10"
                              : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <button
  disabled={!dailyTime || loading}
  onClick={buildMonth}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
>
  {loading ? "Building your month..." : "Build my month"}

  {!loading && <Sparkles className="h-4 w-4" />}
</button>
                  </div>
                )}
                {error && (
  <p className="mt-4 text-center text-sm text-red-400">
    {error}
  </p>
)}

              </div>
            </motion.div>

          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-xs text-white/20">
          Learn deeply. One month at a time.
        </footer>

      </div>
    </main>
  );
}