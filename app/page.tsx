"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";

type Lesson = {
  day: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
};

type CurriculumModule = {
  title: string;
  description: string;
  lessons: Lesson[];
};

type Curriculum = {
  theme: string;
  goal: string;
  modules: CurriculumModule[];
};

type Screen = "review" | "customize" | "locked";
type RetroButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "lime" | "pink";
  className?: string;
  type?: "button" | "submit";
};

const customizationPrompts = [
  "Make it more practical",
  "Make it more beginner-friendly",
  "Focus more on investing",
  "Add more hands-on exercises",
  "Reduce the workload",
];

function RetroButton({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
  className = "",
  type = "button",
}: RetroButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`retro-button retro-button-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

function WindowTitle({
  icon,
  children,
}: {
  icon: string;
  children: ReactNode;
}) {
  return (
    <div className="retro-titlebar">
      <span className="retro-title-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <div className="flex gap-1" aria-hidden="true">
        <span className="retro-window-control">_</span>
        <span className="retro-window-control">□</span>
        <span className="retro-window-control">×</span>
      </div>
    </div>
  );
}

function RetroWindow({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`retro-window ${className}`}>
      <WindowTitle icon={icon}>{title}</WindowTitle>
      <div className="retro-window-body">{children}</div>
    </section>
  );
}

function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <main className="retro-desktop">
      <div className="retro-browserbar">
        <span className="retro-browser-mark">1T</span>
        <span className="retro-tab retro-tab-active">One Thing — home.exe</span>
        <span className="retro-tab hidden sm:inline-flex">your next obsession</span>
        <span className="retro-tab-plus">+</span>
        <span className="retro-clock">03 OCT 2001&nbsp; 4:52 PM</span>
      </div>
      <div className="retro-workspace">
        <header className="retro-site-header">
          <Link href="/" className="retro-brand" aria-label="One Thing home">
            <span className="retro-brand-icon" aria-hidden="true">1</span>
            <span>ONE THING</span>
          </Link>
          <p className="retro-tagline">one curiosity at a time.</p>
          <div className="retro-online">
            <span className="retro-online-dot" />
            SYSTEM ONLINE
          </div>
        </header>
        {children}
        <footer className="retro-footer">
          <span>ONE THING © 2001–2026</span>
          <span>MADE FOR THE CURIOUS <span className="text-[#ff3f9f]">♥</span></span>
          <span>BEST VIEWED WITH CURIOSITY.EXE</span>
        </footer>
      </div>
      <div className="retro-taskbar">
        <div className="retro-start">
          <span aria-hidden="true">✿</span>
          <span>start</span>
        </div>
        <div className="retro-taskbar-app">
          <span aria-hidden="true">💾</span>
          One Thing
        </div>
        <div className="retro-taskbar-tray">
          <span>♫</span>
          <span>☼</span>
          <span>4:52 PM</span>
        </div>
      </div>
      <span className="retro-desktop-sparkle sparkle-one" aria-hidden="true">✦</span>
      <span className="retro-desktop-sparkle sparkle-two" aria-hidden="true">✧</span>
    </main>
  );
}

export default function Home() {
  const [theme, setTheme] = useState("");
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState("");
  const [dailyTime, setDailyTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [screen, setScreen] = useState<Screen>("review");
  const [customizationRequest, setCustomizationRequest] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState("");

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

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Something went wrong.";
        throw new Error(message);
      }

      const generatedCurriculum = data as Curriculum;
      console.log("GENERATED CURRICULUM:", generatedCurriculum);
      setCurriculum(generatedCurriculum);
      setScreen("review");
    } catch (error) {
      console.error(error);
      setError("Something went wrong while building your month.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DesktopFrame>
      {!curriculum ? (
        <div className="retro-home-layout">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="retro-intro"
          >
            <div className="retro-kicker">
              <span className="retro-blink-dot" />
              YOUR MONTHLY LEARNING COMPANION
            </div>
            <h1 className="retro-hero-title">
              ONE THING<span className="retro-title-star">✦</span>
            </h1>
            <p className="retro-hero-subtitle">one curiosity at a time.</p>
            <p className="retro-intro-copy">
              A weird little computer that turns one thing you&apos;re curious
              about into a whole month of learning.
            </p>

            <div className="retro-floppy-card" aria-hidden="true">
              <div className="retro-floppy">
                <div className="retro-floppy-label">YOUR NEXT BIG THING</div>
                <div className="retro-floppy-slot" />
                <div className="retro-floppy-shutter" />
                <div className="retro-floppy-dot" />
              </div>
              <div className="retro-star-sticker">★<br /><small>WOW!</small></div>
              <p className="retro-floppy-caption">curiosity_disk_01.exe</p>
            </div>

            <div className="retro-facts">
              <span><b>30</b> DAYS</span>
              <span><b>01</b> BIG IDEA</span>
              <span><b>∞</b> CURIOSITY</span>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="retro-onboarding-wrap"
          >
            <RetroWindow
              title={step === 1 ? "New Month Wizard" : step === 2 ? "Learner Profile" : "Time Settings"}
              icon={step === 1 ? "📁" : step === 2 ? "🖥️" : "⏰"}
              className="retro-onboarding-window"
            >
              <div className="retro-wizard-meta">
                <span>SETUP WIZARD</span>
                <span>STEP {step} OF 3</span>
              </div>
              <div className="retro-progress-track" aria-label={`Step ${step} of 3`}>
                <span style={{ width: `${(step / 3) * 100}%` }} />
              </div>

              {step === 1 && (
                <div className="retro-step-panel">
                  <p className="retro-step-number">01 / PICK A CURIOSITY</p>
                  <h2>What do you want to master?</h2>
                  <p className="retro-help-copy">
                    Choose a subject to spend the next 30 days exploring.
                  </p>
                  <label className="retro-label" htmlFor="theme-input">YOUR SUBJECT</label>
                  <input
                    id="theme-input"
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    type="text"
                    placeholder="e.g. Financial Literacy"
                    className="retro-input"
                  />
                  <RetroButton
                    disabled={!theme.trim()}
                    onClick={() => setStep(2)}
                    variant="primary"
                    className="mt-5 w-full"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </RetroButton>
                </div>
              )}

              {step === 2 && (
                <div className="retro-step-panel">
                  <p className="retro-step-number">02 / SET YOUR STARTING POINT</p>
                  <h2>What&apos;s your current level?</h2>
                  <p className="retro-help-copy">
                    We&apos;ll start where you are, not where a textbook thinks you should be.
                  </p>
                  <div className="mt-5 grid gap-2">
                    {["Complete beginner", "Some knowledge", "Intermediate"].map((option, index) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setLevel(option)}
                        className={`retro-choice ${level === option ? "retro-choice-selected" : ""}`}
                      >
                        <span className="retro-choice-icon">{["①", "②", "③"][index]}</span>
                        <span>{option}</span>
                        <span className="retro-radio">{level === option ? "●" : "○"}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <RetroButton onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </RetroButton>
                    <RetroButton
                      disabled={!level}
                      onClick={() => setStep(3)}
                      variant="primary"
                      className="flex-[2]"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </RetroButton>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="retro-step-panel">
                  <p className="retro-step-number">03 / PICK YOUR DAILY DOSE</p>
                  <h2>How much time can you give this?</h2>
                  <p className="retro-help-copy">
                    Small daily sessions add up to something big.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {["10 min", "20 min", "30 min", "45 min", "60+ min"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDailyTime(option)}
                        className={`retro-time-option ${dailyTime === option ? "retro-choice-selected" : ""}`}
                      >
                        <span aria-hidden="true">◷</span> {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <RetroButton onClick={() => setStep(2)} className="flex-1">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </RetroButton>
                    <RetroButton
                      disabled={!dailyTime || loading}
                      onClick={buildMonth}
                      variant="lime"
                      className="flex-[2]"
                    >
                      {loading ? (
                        <><LoaderCircle className="h-4 w-4 animate-spin" /> Building...</>
                      ) : (
                        <>Build my month <Sparkles className="h-4 w-4" /></>
                      )}
                    </RetroButton>
                  </div>
                  {loading && (
                    <div className="retro-loading-wrap" role="status">
                      <p>ASKING THE KNOWLEDGE MACHINE...</p>
                      <div className="retro-loading-track"><span /></div>
                    </div>
                  )}
                </div>
              )}

              {error && <p role="alert" className="retro-error">{error}</p>}
              <div className="retro-window-status">
                <span><span className="retro-status-led" /> READY</span>
                <span>ONE THING SETUP.EXE</span>
              </div>
            </RetroWindow>
            <div className="retro-sticker-line" aria-hidden="true">
              <span>NO POP QUIZZES!</span><span>☆</span><span>JUST CURIOSITY</span>
            </div>
          </motion.div>
        </div>
      ) : screen === "locked" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="retro-dialog-stage"
        >
          <RetroWindow title="Month Locked In!" icon="🔒" className="retro-dialog-window">
            <div className="retro-dialog-content">
              <div className="retro-dialog-icon" aria-hidden="true">💿</div>
              <p className="retro-dialog-eyebrow">{curriculum.theme} / 30-DAY COURSE</p>
              <h1>Your month is locked in.</h1>
              <p>Day 1 is ready when you are.</p>
              <div className="retro-dialog-actions">
                <RetroButton onClick={() => setScreen("review")}>
                  <ArrowLeft className="h-4 w-4" /> Back to your month
                </RetroButton>
              </div>
            </div>
            <div className="retro-window-status">
              <span><span className="retro-status-led" /> SAVED TO YOUR MONTH</span>
              <span>DAY 1: STANDING BY</span>
            </div>
          </RetroWindow>
        </motion.div>
      ) : screen === "customize" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="retro-dialog-stage"
        >
          <RetroWindow title="Month Preferences" icon="📝" className="retro-customize-window">
            <div className="retro-customize-heading">
              <div>
                <p className="retro-step-number">CUSTOMIZE / {curriculum.theme.toUpperCase()}</p>
                <h1>Make this month yours.</h1>
                <p>
                  This plan is your starting point. Tell the machine what you
                  would change to make it feel more like you.
                </p>
              </div>
              <div className="retro-customize-disk" aria-hidden="true">✎</div>
            </div>

            <label htmlFor="customization-request" className="retro-label">
              YOUR INSTRUCTIONS.TXT
            </label>
            <textarea
              id="customization-request"
              value={customizationRequest}
              onChange={(event) => {
                setCustomizationRequest(event.target.value);
                setSubmittedRequest("");
              }}
              placeholder="Type your request here..."
              rows={4}
              className="retro-input retro-textarea"
            />

            <p className="retro-label retro-suggestions-label">QUICK IDEAS — CLICK TO LOAD</p>
            <div className="retro-suggestions">
              {customizationPrompts.map((prompt, index) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setCustomizationRequest(prompt);
                    setSubmittedRequest("");
                  }}
                  className={`retro-suggestion retro-suggestion-${index % 4}`}
                >
                  <span aria-hidden="true">{["✦", "★", "➜", "✎", "−"][index]}</span>
                  {prompt}
                </button>
              ))}
            </div>

            <RetroButton
              disabled={!customizationRequest.trim()}
              onClick={() => setSubmittedRequest(customizationRequest.trim())}
              variant="primary"
              className="mt-6 w-full"
            >
              Send to the machine <ArrowRight className="h-4 w-4" />
            </RetroButton>

            {submittedRequest && (
              <div role="status" className="retro-request-status">
                <div className="retro-request-icon" aria-hidden="true">📨</div>
                <div className="min-w-0">
                  <p className="retro-label">REQUEST RECEIVED</p>
                  <p className="retro-request-text">{submittedRequest}</p>
                  <p className="retro-reshape">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    I&apos;ll reshape your month around that.
                  </p>
                  <p className="retro-small-note">
                    PREVIEW MODE: the original month is safe and unchanged.
                  </p>
                </div>
              </div>
            )}
            <div className="retro-customize-footer">
              <RetroButton onClick={() => setScreen("review")}>
                <ArrowLeft className="h-4 w-4" /> Back to the month
              </RetroButton>
              <span>CTRL + S TO SAVE YOUR CURIOSITY</span>
            </div>
            <div className="retro-window-status">
              <span><span className="retro-status-led" /> PREFERENCES OPEN</span>
              <span>NO CHANGES SAVED YET</span>
            </div>
          </RetroWindow>
        </motion.div>
      ) : (
        <div className="retro-review">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="retro-review-heading"
          >
            <div>
              <div className="retro-kicker"><span className="retro-blink-dot" /> CURRICULUM GENERATED SUCCESSFULLY</div>
              <h1>{curriculum.theme}<span className="retro-title-star">✦</span></h1>
              <p>{curriculum.goal}</p>
            </div>
            <div className="retro-review-badge">
              <span aria-hidden="true">💾</span>
              <span>MONTH FILE<br /><b>30 DAYS</b></span>
            </div>
          </motion.div>

          <div className="retro-module-grid">
            {curriculum.modules.map((module, moduleIndex) => (
              <motion.section
                key={`${module.title}-${moduleIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: moduleIndex * 0.05 }}
                className="retro-module-window"
              >
                <WindowTitle icon={moduleIndex % 2 === 0 ? "📂" : "📁"}>
                  {`UNIT_${String(moduleIndex + 1).padStart(2, "0")}.DIR`}
                </WindowTitle>
                <div className="retro-module-body">
                  <p className="retro-unit-label">LEARNING UNIT {moduleIndex + 1}</p>
                  <h2>{module.title}</h2>
                  <p className="retro-module-description">{module.description}</p>
                  <div className="retro-lessons">
                    {module.lessons.map((lesson) => (
                      <article key={lesson.day} className="retro-lesson">
                        <div className="retro-day-number">{String(lesson.day).padStart(2, "0")}</div>
                        <div className="retro-lesson-copy">
                          <h3>{lesson.title}</h3>
                          <p>{lesson.description}</p>
                        </div>
                        <div className="retro-lesson-meta">
                          <span>{lesson.estimatedMinutes} MIN</span>
                          <span className={`retro-difficulty difficulty-${lesson.difficulty}`}>
                            {lesson.difficulty}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="retro-ready-window"
          >
            <WindowTitle icon="⭐">NEXT_STEP.DLL</WindowTitle>
            <div className="retro-ready-body">
              <div className="retro-ready-copy">
                <p className="retro-step-number">THE PLAN IS IN THE DRIVE</p>
                <h2>Your month is ready.</h2>
                <p>Take a look through your plan. You can make it yours before you begin.</p>
                {error && <p role="alert" className="retro-error">{error}</p>}
              </div>
              <div className="retro-ready-actions">
                <RetroButton
                  disabled={loading}
                  onClick={() => setScreen("locked")}
                  variant="lime"
                >
                  Go ahead <ArrowRight className="h-4 w-4" />
                </RetroButton>
                <RetroButton
                  disabled={loading}
                  onClick={() => {
                    setSubmittedRequest("");
                    setScreen("customize");
                  }}
                  variant="pink"
                >
                  ✎ Customize my month
                </RetroButton>
                <RetroButton disabled={loading} onClick={buildMonth}>
                  {loading ? (
                    <><LoaderCircle className="h-4 w-4 animate-spin" /> Regenerating...</>
                  ) : (
                    <>↻ Regenerate <Sparkles className="h-4 w-4" /></>
                  )}
                </RetroButton>
                {loading && (
                  <div className="retro-loading-wrap" role="status">
                    <p>REBUILDING YOUR MONTH...</p>
                    <div className="retro-loading-track"><span /></div>
                  </div>
                )}
              </div>
            </div>
            <div className="retro-window-status">
              <span><span className="retro-status-led" /> ALL SYSTEMS GO</span>
              <span>CHOOSE YOUR NEXT MOVE</span>
            </div>
          </motion.section>
        </div>
      )}
    </DesktopFrame>
  );
}
