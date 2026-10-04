"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { AuthControls, useAuth } from "../components/auth-provider";

type RoadmapWeek = {
  week: number;
  title: string;
  description: string;
  subtopics: string[];
};

type Curriculum = {
  theme: string;
  goal: string;
  weeks: RoadmapWeek[];
};

function isCurriculum(value: unknown): value is Curriculum {
  if (!value || typeof value !== "object") return false;
  const roadmap = value as Partial<Curriculum>;
  return (
    typeof roadmap.theme === "string" &&
    typeof roadmap.goal === "string" &&
    Array.isArray(roadmap.weeks) &&
    roadmap.weeks.every(
      (week) =>
        typeof week.week === "number" &&
        typeof week.title === "string" &&
        typeof week.description === "string" &&
        Array.isArray(week.subtopics) &&
        week.subtopics.every((subtopic) => typeof subtopic === "string"),
    )
  );
}

type Screen = "review" | "customize" | "locked" | "learning";
type TopicResource = {
  title: string;
  url: string;
  source: string;
  description: string;
  publishedDate: string | null;
};
type RetroButtonProps = {
  children: ReactNode;
  onClick?: () => void;
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
          <AuthControls />
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
  const { user, openAuth } = useAuth();
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
  const [flowReady, setFlowReady] = useState(false);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [completedTopicIndexes, setCompletedTopicIndexes] = useState<number[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [resources, setResources] = useState<TopicResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");
  const [topicSummary, setTopicSummary] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [question, setQuestion] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [notesTopicIndex, setNotesTopicIndex] = useState<number | null>(null);
  const [notesEmail, setNotesEmail] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [notesError, setNotesError] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    const shouldRestore =
      window.sessionStorage.getItem("one-thing-auth-return") === "true";
    window.sessionStorage.removeItem("one-thing-auth-return");

    if (shouldRestore) {
      const savedState = window.sessionStorage.getItem("one-thing-flow");
      if (savedState) {
        try {
          const parsed: unknown = JSON.parse(savedState);
          if (parsed && typeof parsed === "object") {
            const saved = parsed as Record<string, unknown>;
            startTransition(() => {
              if (typeof saved.theme === "string") setTheme(saved.theme);
              if (saved.step === 1 || saved.step === 2 || saved.step === 3) {
                setStep(saved.step);
              }
              if (typeof saved.level === "string") setLevel(saved.level);
              if (typeof saved.dailyTime === "string") setDailyTime(saved.dailyTime);
              if (isCurriculum(saved.curriculum)) setCurriculum(saved.curriculum);
              if (
                saved.screen === "review" ||
                saved.screen === "customize" ||
                saved.screen === "locked" ||
                saved.screen === "learning"
              ) {
                setScreen(saved.screen);
              }
              if (
                typeof saved.selectedTopicIndex === "number" &&
                Number.isInteger(saved.selectedTopicIndex) &&
                saved.selectedTopicIndex >= 0
              ) {
                setSelectedTopicIndex(saved.selectedTopicIndex);
              }
              if (typeof saved.customizationRequest === "string") {
                setCustomizationRequest(saved.customizationRequest);
              }
              if (typeof saved.submittedRequest === "string") {
                setSubmittedRequest(saved.submittedRequest);
              }
            });
          }
        } catch (cause) {
          console.error("Could not restore the One Thing flow after auth:", cause);
          window.sessionStorage.removeItem("one-thing-flow");
        }
      }
    }

    startTransition(() => setFlowReady(true));
  }, []);

  useEffect(() => {
    if (!flowReady) return;
    window.sessionStorage.setItem(
      "one-thing-flow",
      JSON.stringify({
        theme,
        step,
        level,
        dailyTime,
        curriculum,
        screen,
        customizationRequest,
        submittedRequest,
        selectedTopicIndex,
      }),
    );
  }, [
    flowReady,
    theme,
    step,
    level,
    dailyTime,
    curriculum,
    screen,
    customizationRequest,
    submittedRequest,
    selectedTopicIndex,
  ]);

  const weekOne = curriculum?.weeks[0];
  const weekOneTopics = useMemo(
    () => weekOne?.subtopics.slice(0, 5) ?? [],
    [weekOne],
  );
  const selectedTopic = weekOneTopics[selectedTopicIndex] ?? weekOneTopics[0];
  const weekOneComplete =
    Boolean(user) &&
    weekOneTopics.length > 0 &&
    weekOneTopics.every((_, index) => completedTopicIndexes.includes(index));

  useEffect(() => {
    if (screen !== "learning" || !user) return;
    let active = true;

    const loadProgress = async () => {
      try {
        const response = await fetch("/api/topic-progress");
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            data &&
              typeof data === "object" &&
              "error" in data &&
              typeof data.error === "string"
              ? data.error
              : "Could not load your Week 1 progress.",
          );
        }
        if (
          !data ||
          typeof data !== "object" ||
          !("completedTopics" in data) ||
          !Array.isArray(data.completedTopics)
        ) {
          throw new Error("The progress response was invalid.");
        }
        if (active) {
          setCompletedTopicIndexes(
            data.completedTopics
              .map((entry) => {
                if (
                  !entry ||
                  typeof entry !== "object" ||
                  !("topic_index" in entry) ||
                  typeof entry.topic_index !== "number" ||
                  !("topic" in entry) ||
                  typeof entry.topic !== "string"
                ) {
                  return -1;
                }
                return weekOneTopics[entry.topic_index] === entry.topic
                  ? entry.topic_index
                  : -1;
              })
              .filter((index) => index >= 0 && index < weekOneTopics.length),
          );
          setProgressError("");
        }
      } catch (cause) {
        if (active) {
          console.error("Could not load Week 1 progress:", cause);
          setProgressError("Your saved progress could not be loaded.");
        }
      } finally {
        if (active) setProgressLoading(false);
      }
    };

    void loadProgress();
    return () => {
      active = false;
    };
  }, [screen, user, weekOneTopics]);

  useEffect(() => {
    if (screen !== "learning" || !user || !weekOne || !selectedTopic) return;
    let active = true;

    const loadTopicContent = async () => {
      let retrievedResources: TopicResource[];
      try {
        const response = await fetch("/api/topic-resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: curriculum.theme, topic: selectedTopic }),
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          const message =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Could not find resources for this topic.";
          throw new Error(message);
        }
        if (
          !data ||
          typeof data !== "object" ||
          !("resources" in data) ||
          !Array.isArray(data.resources)
        ) {
          throw new Error("The resource search returned an invalid response.");
        }
        retrievedResources = data.resources as TopicResource[];
        if (active) {
          setResources(retrievedResources);
          setResourcesError("");
        }
      } catch (cause) {
        if (active) {
          console.error("Could not search topic resources:", cause);
          setResourcesError(
            cause instanceof Error
              ? cause.message
              : "Could not find resources for this topic.",
          );
          setSummaryError("A source-based summary needs retrieved articles.");
          setResourcesLoading(false);
          setSummaryLoading(false);
        }
        return;
      }

      if (!active) return;
      setResourcesLoading(false);

      if (retrievedResources.length === 0) {
        setSummaryError("A source-based summary needs retrieved articles.");
        setSummaryLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/topic-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "summary",
            theme: curriculum.theme,
            weekTitle: weekOne.title,
            weekDescription: weekOne.description,
            topic: selectedTopic,
            resources: retrievedResources.map((resource) => ({
              title: resource.title,
              source: resource.source,
              url: resource.url,
              snippet: resource.description,
            })),
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
              : "Could not create a short summary.";
          throw new Error(message);
        }
        if (
          !data ||
          typeof data !== "object" ||
          !("bullets" in data) ||
          !Array.isArray(data.bullets) ||
          !data.bullets.every((bullet) => typeof bullet === "string")
        ) {
          throw new Error("The summary response was invalid.");
        }
        if (active) setTopicSummary(data.bullets);
      } catch (cause) {
        if (active) {
          console.error("Could not create source-based topic summary:", cause);
          setSummaryError(
            cause instanceof Error
              ? cause.message
              : "Could not create a short summary.",
          );
        }
      } finally {
        if (active) setSummaryLoading(false);
      }
    };

    void loadTopicContent();
    return () => {
      active = false;
    };
  }, [screen, user, curriculum, weekOne, selectedTopic, selectedTopicIndex]);

  const selectTopic = (index: number) => {
    if (index === selectedTopicIndex) return;
    setSelectedTopicIndex(index);
    setResourcesLoading(true);
    setSummaryLoading(true);
    setResources([]);
    setTopicSummary([]);
    setResourcesError("");
    setSummaryError("");
    setQuestion("");
    setQuestionAnswer("");
    setQuestionError("");
  };

  const updateTopicCompletion = async (topicIndex: number, completed: boolean) => {
    if (!user) {
      openAuth("login");
      return;
    }

    const topic = weekOneTopics[topicIndex];
    if (!topic) return;

    setProgressLoading(true);
    setProgressError("");
    try {
      const response = await fetch("/api/topic-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: 1, topicIndex, topic, completed }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Could not save your progress.",
        );
      }

      setCompletedTopicIndexes((current) =>
        completed
          ? [...new Set([...current, topicIndex])]
          : current.filter((index) => index !== topicIndex),
      );
      if (completed) {
        setNotesTopicIndex(topicIndex);
        setNotesEmail(user.email ?? "");
        setNotesMessage("");
        setNotesError("");
      }
    } catch (cause) {
      console.error("Could not save topic completion:", cause);
      setProgressError(
        cause instanceof Error ? cause.message : "Could not save your progress.",
      );
    } finally {
      setProgressLoading(false);
    }
  };

  const askTopicQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTopic || !question.trim()) return;
    setQuestionLoading(true);
    setQuestionError("");
    setQuestionAnswer("");

    try {
      const response = await fetch("/api/topic-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "question",
          topic: selectedTopic,
          question: question.trim(),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Could not answer your question.",
        );
      }
      if (
        !data ||
        typeof data !== "object" ||
        !("answer" in data) ||
        typeof data.answer !== "string"
      ) {
        throw new Error("The answer response was invalid.");
      }
      setQuestionAnswer(data.answer);
    } catch (cause) {
      console.error("Could not answer topic question:", cause);
      setQuestionError(
        cause instanceof Error ? cause.message : "Could not answer your question.",
      );
    } finally {
      setQuestionLoading(false);
    }
  };

  const saveNotesRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (notesTopicIndex === null) return;
    setNotesSaving(true);
    setNotesError("");
    setNotesMessage("");

    try {
      const response = await fetch("/api/topic-notes-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week: 1,
          topic: weekOneTopics[notesTopicIndex],
          email: notesEmail.trim(),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Could not save your request.",
        );
      }
      setNotesMessage("Saved! We will not send an email yet.");
    } catch (cause) {
      console.error("Could not save topic notes email request:", cause);
      setNotesError(
        cause instanceof Error ? cause.message : "Could not save your request.",
      );
    } finally {
      setNotesSaving(false);
    }
  };

  const buildMonth = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-roadmap", {
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
              about into a four-week learning adventure.
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
              <span><b>04</b> WEEKS</span>
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
                    Choose a subject to explore over the next four weeks.
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
              <p className="retro-dialog-eyebrow">{curriculum.theme} / 4-WEEK ROADMAP</p>
              <h1>Your month is locked in.</h1>
              <p>Week 1 is ready when you are.</p>
              <div className="retro-dialog-actions">
                <RetroButton
                  variant="lime"
                  onClick={() => {
                    setSelectedTopicIndex(0);
                    setResourcesLoading(true);
                    setSummaryLoading(true);
                    setProgressLoading(Boolean(user));
                    setScreen("learning");
                    if (!user) openAuth("login");
                  }}
                >
                  Start Week 1 <ArrowRight className="h-4 w-4" />
                </RetroButton>
                <RetroButton onClick={() => setScreen("review")}>
                  <ArrowLeft className="h-4 w-4" /> Back to your month
                </RetroButton>
              </div>
            </div>
            <div className="retro-window-status">
              <span><span className="retro-status-led" /> SAVED TO YOUR MONTH</span>
              <span>WEEK 1: STANDING BY</span>
            </div>
          </RetroWindow>
        </motion.div>
      ) : screen === "learning" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="retro-learning-page"
        >
          <div className="retro-learning-heading">
            <div>
              <p className="retro-step-number">YOUR ROADMAP / WEEK 01</p>
              <h1>{weekOne?.title ?? "Week 1"}</h1>
              <p>{weekOne?.description}</p>
            </div>
            <div className="retro-week-progress">
              <span>WEEK 1 PROGRESS</span>
              <strong>{completedTopicIndexes.length}/{weekOneTopics.length} TOPICS</strong>
              <div
                className="retro-progress-track"
                aria-label={`${completedTopicIndexes.length} of ${weekOneTopics.length} topics complete`}
              >
                <span
                  style={{
                    width: `${weekOneTopics.length ? (completedTopicIndexes.length / weekOneTopics.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="retro-learning-grid">
            <RetroWindow title="Week 1 topic list" icon="📂" className="retro-topic-list-window">
              <p className="retro-topic-list-intro">
                Pick a topic to open its learning panel. Check it off when you feel ready.
              </p>
              <div className="retro-topic-stack">
                {weekOneTopics.map((topic, index) => {
                  const complete =
                    Boolean(user) && completedTopicIndexes.includes(index);
                  return (
                    <div
                      key={`${index}-${topic}`}
                      className={`retro-topic-row ${selectedTopicIndex === index ? "retro-topic-row-selected" : ""} ${complete ? "retro-topic-row-complete" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={complete}
                        disabled={progressLoading}
                        aria-label={`Mark ${topic} ${complete ? "incomplete" : "complete"}`}
                        onChange={(event) =>
                          void updateTopicCompletion(index, event.target.checked)
                        }
                        className="retro-topic-checkbox"
                      />
                      <button
                        type="button"
                        className="retro-topic-select"
                        onClick={() => selectTopic(index)}
                        aria-current={selectedTopicIndex === index ? "true" : undefined}
                      >
                        <span className="retro-topic-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>{topic}</span>
                      </button>
                    </div>
                  );
                })}
                {weekOneTopics.length === 0 && (
                  <p className="retro-error">
                    This roadmap has no Week 1 topics. Generate a roadmap with Week 1 subtopics to begin.
                  </p>
                )}
              </div>
              {!user && (
                <div className="retro-progress-message" role="status">
                  Sign in to save Week 1 progress.
                  <button type="button" onClick={() => openAuth("login")}>Log in</button>
                </div>
              )}
              {progressError && (
                <p role="alert" className="retro-error">{progressError}</p>
              )}
              {progressLoading && (
                <p className="retro-progress-saving" role="status">
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                  Syncing your progress...
                </p>
              )}
              <div className={`retro-week-unlock ${weekOneComplete ? "retro-week-unlock-open" : ""}`}>
                <span aria-hidden="true">{weekOneComplete ? "🔓" : "🔒"}</span>
                <span>
                  <b>{weekOneComplete ? "WEEK 2 UNLOCKED!" : "WEEK 2 LOCKED"}</b>
                  <small>
                    {weekOneComplete
                      ? "Week 1 complete. Keep going in your roadmap."
                      : "Complete every Week 1 topic to unlock it."}
                  </small>
                </span>
              </div>
              <div className="retro-topic-list-actions">
                <RetroButton onClick={() => setScreen("review")}>
                  <ArrowLeft className="h-4 w-4" /> Back to roadmap
                </RetroButton>
              </div>
            </RetroWindow>

            <RetroWindow
              title={selectedTopic ? `${selectedTopic.slice(0, 38)}${selectedTopic.length > 38 ? "..." : ""}` : "Topic content"}
              icon="📖"
              className="retro-topic-content-window"
            >
              {selectedTopic ? (
                <>
                  <div className="retro-topic-content-heading">
                    <p className="retro-step-number">
                      WEEK 1 / TOPIC {String(selectedTopicIndex + 1).padStart(2, "0")}
                    </p>
                    <h2>{selectedTopic}</h2>
                  </div>

                  <div className="retro-resource-section">
                    <p className="retro-label">USEFUL LINKS FROM A LIVE SEARCH</p>
                    {!user ? (
                      <p className="retro-resource-notice">
                        Sign in to load verified links and topic notes.
                      </p>
                    ) : resourcesLoading ? (
                      <div className="retro-content-loading" role="status">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Searching for real resources...
                      </div>
                    ) : resourcesError ? (
                      <p role="alert" className="retro-resource-notice">{resourcesError}</p>
                    ) : resources.length > 0 ? (
                      <div className="retro-resource-list">
                        {resources.map((resource) => (
                          <article key={resource.url} className="retro-resource-card">
                            <p className="retro-resource-source">{resource.source}</p>
                            <h3>{resource.title}</h3>
                            {resource.description && <p>{resource.description}</p>}
                            <a href={resource.url} target="_blank" rel="noreferrer">
                              Read article <span aria-hidden="true">→</span>
                            </a>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="retro-resource-notice">
                        No matching articles were returned. Try another topic or come back later.
                      </p>
                    )}
                  </div>

                  <div className="retro-summary-panel">
                    <div className="retro-summary-title">
                      <span aria-hidden="true">✦</span>
                      <p className="retro-label">QUICK IDEA — NOT A FULL LESSON</p>
                    </div>
                    {!user ? (
                      <p className="retro-content-loading">
                        Sign in to load a concise AI summary.
                      </p>
                    ) : summaryLoading ? (
                      <p className="retro-content-loading" role="status">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Making a short topic summary...
                      </p>
                    ) : summaryError ? (
                      <p role="alert" className="retro-resource-notice">{summaryError}</p>
                    ) : (
                      <ul className="retro-summary-bullets">
                        {topicSummary.map((bullet, index) => (
                          <li key={`${index}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <section className="retro-ask-panel">
                    <p className="retro-ask-title">Still confused?</p>
                    <p className="retro-ask-description">
                      Ask one specific question about this topic.
                    </p>
                    <form onSubmit={askTopicQuestion} className="retro-ask-form">
                      <label className="retro-sr-only" htmlFor="topic-question">
                        Your question about {selectedTopic}
                      </label>
                      <input
                        id="topic-question"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        maxLength={1000}
                        placeholder="What would you like clarified?"
                        className="retro-input"
                      />
                      <RetroButton
                        type="submit"
                        variant="primary"
                        disabled={!question.trim() || questionLoading}
                      >
                        {questionLoading ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Ask <ArrowRight className="h-4 w-4" /></>
                        )}
                      </RetroButton>
                    </form>
                    {questionError && (
                      <p role="alert" className="retro-error">{questionError}</p>
                    )}
                    {questionAnswer && (
                      <div className="retro-answer" role="status">
                        <p className="retro-label">ONE THING EXPLAINS</p>
                        <p>{questionAnswer}</p>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <p className="retro-resource-notice">Choose a Week 1 topic to get started.</p>
              )}
              <div className="retro-window-status">
                <span><span className="retro-status-led" /> TOPIC VIEWER READY</span>
                <span>ONE THING LEARN.EXE</span>
              </div>
            </RetroWindow>
          </div>

          {notesTopicIndex !== null && (
            <div
              className="retro-notes-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setNotesTopicIndex(null);
              }}
            >
              <RetroWindow title="Send notes to your inbox?" icon="✉️" className="retro-notes-window">
                <p className="retro-notes-title">
                  Want the notes + useful links in your inbox?
                </p>
                <p className="retro-notes-topic">
                  Topic: <b>{weekOneTopics[notesTopicIndex]}</b>
                </p>
                <form onSubmit={saveNotesRequest}>
                  <label htmlFor="notes-email" className="retro-label">EMAIL ADDRESS</label>
                  <input
                    id="notes-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={notesEmail}
                    onChange={(event) => setNotesEmail(event.target.value)}
                    className="retro-input"
                    placeholder="you@example.com"
                  />
                  {notesError && <p role="alert" className="retro-error">{notesError}</p>}
                  {notesMessage && <p role="status" className="retro-auth-message">{notesMessage}</p>}
                  <div className="retro-notes-actions">
                    <RetroButton type="submit" variant="lime" disabled={notesSaving}>
                      {notesSaving ? "Saving..." : "Save request"}
                    </RetroButton>
                    <RetroButton onClick={() => setNotesTopicIndex(null)}>
                      {notesMessage ? "Done" : "Not now"}
                    </RetroButton>
                  </div>
                </form>
                <p className="retro-notes-footnote">
                  We&apos;ll save this request only. No email will be sent yet.
                </p>
              </RetroWindow>
            </div>
          )}
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
              <span>ROADMAP FILE<br /><b>4 WEEKS</b></span>
            </div>
          </motion.div>

          <div className="retro-module-grid">
            {curriculum.weeks.map((week, weekIndex) => (
              <motion.section
                key={week.week}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: weekIndex * 0.05 }}
                className="retro-module-window"
              >
                <WindowTitle icon={weekIndex % 2 === 0 ? "📂" : "📁"}>
                  {`WEEK_${String(week.week).padStart(2, "0")}.DIR`}
                </WindowTitle>

                <div className="retro-module-body">
                  <p className="retro-unit-label">LEARNING WEEK {week.week}</p>
                  <h2>{week.title}</h2>
                  <p className="retro-module-description">{week.description}</p>

                  <div className="retro-lessons">
                    {week.subtopics.map((subtopic, subtopicIndex) => (
                      <article
                        key={`${week.week}-${subtopicIndex}`}
                        className="retro-lesson"
                      >
                        <div className="retro-day-number">
                          {String(subtopicIndex + 1).padStart(2, "0")}
                        </div>
                        <div className="retro-lesson-copy">
                          <h3>{subtopic}</h3>
                        </div>
                        <div className="retro-lesson-meta">
                          <span>TOPIC</span>
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
