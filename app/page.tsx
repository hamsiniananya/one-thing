"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
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

type Screen = "review" | "customize" | "locked" | "learning" | "dashboard";
type LearningReturnScreen = "roadmap" | "dashboard";
type CompletedTopic = {
  topic_index: number;
  topic: string;
  updated_at?: string;
};
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
  const [roadmapStatus, setRoadmapStatus] = useState<
    "idle" | "loading" | "empty" | "found" | "error"
  >("idle");
  const [roadmapUserId, setRoadmapUserId] = useState<string | null>(null);
  const [roadmapOwnerId, setRoadmapOwnerId] = useState<string | null>(null);
  const [learningReturnScreen, setLearningReturnScreen] =
    useState<LearningReturnScreen>("roadmap");
  const [completedTopicDates, setCompletedTopicDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [completedTopicIndexes, setCompletedTopicIndexes] = useState<number[]>([]);
  const [progressRefresh, setProgressRefresh] = useState(0);
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
  const questionController = useRef<AbortController | null>(null);
  const [notesTopicIndex, setNotesTopicIndex] = useState<number | null>(null);
  const [notesEmail, setNotesEmail] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [notesError, setNotesError] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const clearTopicQuestion = () => {
    questionController.current?.abort();
    questionController.current = null;
    setQuestion("");
    setQuestionAnswer("");
    setQuestionLoading(false);
    setQuestionError("");
  };

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
                saved.screen === "learning" ||
                saved.screen === "dashboard"
              ) {
                setScreen(saved.screen);
              }
              if (
                saved.learningReturnScreen === "roadmap" ||
                saved.learningReturnScreen === "dashboard"
              ) {
                setLearningReturnScreen(saved.learningReturnScreen);
              }
              if (
                typeof saved.roadmapOwnerId === "string" ||
                saved.roadmapOwnerId === null
              ) {
                setRoadmapOwnerId(saved.roadmapOwnerId);
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
        learningReturnScreen,
        roadmapOwnerId,
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
    learningReturnScreen,
    roadmapOwnerId,
  ]);

  const currentUserId = user?.id;
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;

    const loadSavedRoadmap = async () => {
      setRoadmapStatus("loading");
      setRoadmapUserId(currentUserId);
      try {
        const response = await fetch("/api/user-roadmap");
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            data &&
              typeof data === "object" &&
              "error" in data &&
              typeof data.error === "string"
              ? data.error
              : "Could not load your roadmap.",
          );
        }
        if (
          !data ||
          typeof data !== "object" ||
          !("roadmap" in data) ||
          (data.roadmap !== null && !isCurriculum(data.roadmap))
        ) {
          throw new Error("The saved roadmap response was invalid.");
        }

        if (!active) return;
        if (isCurriculum(data.roadmap)) {
          setCurriculum(data.roadmap);
          setRoadmapOwnerId(currentUserId);
          setTheme(data.roadmap.theme);
          setScreen("dashboard");
          setRoadmapStatus("found");
        } else {
          if (roadmapOwnerId && roadmapOwnerId !== currentUserId) {
            setCurriculum(null);
            setScreen("review");
            setTheme("");
            setLevel("");
            setDailyTime("");
            setStep(1);
            setRoadmapOwnerId(null);
          }
          setRoadmapStatus("empty");
        }
      } catch (cause) {
        if (!active) return;
        console.error("Could not load saved roadmap:", cause);
        setRoadmapStatus("error");
        setError("Could not check for a saved roadmap. You can still continue this session.");
      }
    };

    void loadSavedRoadmap();
    return () => {
      active = false;
    };
  }, [currentUserId, roadmapOwnerId]);

  useEffect(() => {
    if (
      !currentUserId ||
      !curriculum ||
      roadmapUserId !== currentUserId ||
      (roadmapOwnerId !== null && roadmapOwnerId !== currentUserId) ||
      roadmapStatus !== "empty"
    ) {
      return;
    }

    let active = true;
    const saveCurrentRoadmap = async () => {
      try {
        const response = await fetch("/api/user-roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(curriculum),
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            data &&
              typeof data === "object" &&
              "error" in data &&
              typeof data.error === "string"
              ? data.error
              : "Could not save your roadmap.",
          );
        }
        if (active) {
          setRoadmapOwnerId(currentUserId);
          setRoadmapStatus("found");
        }
      } catch (cause) {
        if (!active) return;
        console.error("Could not save the current roadmap:", cause);
        setRoadmapStatus("error");
        setError("Your roadmap is ready, but it could not be saved to your account.");
      }
    };

    void saveCurrentRoadmap();
    return () => {
      active = false;
    };
  }, [currentUserId, curriculum, roadmapUserId, roadmapOwnerId, roadmapStatus]);

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
  const dashboardCalendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - offset + 1;
      return day >= 1 && day <= daysInMonth ? day : null;
    });
  }, [calendarMonth]);
  const calendarMonthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-`;
  const calendarMonthCompletionCount = completedTopicDates.filter((date) =>
    date.startsWith(calendarMonthKey),
  ).length;

  useEffect(() => {
    if ((screen !== "learning" && screen !== "dashboard") || !currentUserId) return;
    let active = true;

    const loadProgress = async () => {
      setProgressLoading(true);
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
          setCompletedTopicDates(
            data.completedTopics
              .filter(
                (entry): entry is CompletedTopic =>
                  Boolean(entry) &&
                  typeof entry === "object" &&
                  "topic_index" in entry &&
                  typeof entry.topic_index === "number" &&
                  "topic" in entry &&
                  typeof entry.topic === "string" &&
                  "updated_at" in entry &&
                  typeof entry.updated_at === "string" &&
                  weekOneTopics[entry.topic_index] === entry.topic,
              )
              .map((entry) => {
                const date = new Date(entry.updated_at!);
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              }),
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
  }, [screen, currentUserId, weekOneTopics, progressRefresh]);

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
    clearTopicQuestion();
    setSelectedTopicIndex(index);
    setResourcesLoading(true);
    setSummaryLoading(true);
    setResources([]);
    setTopicSummary([]);
    setResourcesError("");
    setSummaryError("");
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
      setProgressRefresh((revision) => revision + 1);
      if (completed) {
        const completesWeek = weekOneTopics.every(
          (_, index) =>
            index === topicIndex || completedTopicIndexes.includes(index),
        );
        if (completesWeek) {
          const promptResponse = await fetch("/api/topic-notes-request?week=1");
          const promptData: unknown = await promptResponse.json();
          if (
            !promptResponse.ok ||
            !promptData ||
            typeof promptData !== "object" ||
            !("status" in promptData) ||
            (promptData.status !== null &&
              promptData.status !== "requested" &&
              promptData.status !== "deferred")
          ) {
            throw new Error("Could not check your notes prompt status.");
          }
          if (promptData.status === null) {
            setNotesTopicIndex(topicIndex);
            setNotesEmail(user.email ?? "");
            setNotesMessage("");
            setNotesError("");
          }
        }
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
    const controller = new AbortController();
    questionController.current = controller;

    try {
      const response = await fetch("/api/topic-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      if (!controller.signal.aborted) setQuestionAnswer(data.answer);
    } catch (cause) {
      if (controller.signal.aborted) return;
      console.error("Could not answer topic question:", cause);
      setQuestionError(
        cause instanceof Error ? cause.message : "Could not answer your question.",
      );
    } finally {
      if (questionController.current === controller) {
        questionController.current = null;
        setQuestionLoading(false);
      }
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
          action: "requested",
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
      setNotesTopicIndex(null);
    } catch (cause) {
      console.error("Could not save topic notes email request:", cause);
      setNotesError(
        cause instanceof Error ? cause.message : "Could not save your request.",
      );
    } finally {
      setNotesSaving(false);
    }
  };

  const deferNotesPrompt = async () => {
    setNotesError("");
    try {
      const response = await fetch("/api/topic-notes-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deferred", week: 1 }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Could not save your choice.",
        );
      }
      setNotesTopicIndex(null);
    } catch (cause) {
      console.error("Could not defer the week notes prompt:", cause);
      setNotesError(
        cause instanceof Error ? cause.message : "Could not save your choice.",
      );
    }
  };

  const startWeekOne = (returnTo: LearningReturnScreen) => {
    clearTopicQuestion();
    setLearningReturnScreen(returnTo);
    setSelectedTopicIndex(0);
    setResourcesLoading(true);
    setSummaryLoading(true);
    setProgressLoading(Boolean(user));
    setScreen("learning");
    if (!user) openAuth("login");
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

      if (!isCurriculum(data)) {
        throw new Error("The roadmap response was invalid.");
      }
      const generatedCurriculum = data;
      console.log("GENERATED CURRICULUM:", generatedCurriculum);
      setCurriculum(generatedCurriculum);
      setRoadmapOwnerId(user?.id ?? null);
      setScreen("review");

      if (user) {
        try {
          const saveResponse = await fetch("/api/user-roadmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generatedCurriculum),
          });
          const saveData: unknown = await saveResponse.json();
          if (!saveResponse.ok) {
            throw new Error(
              saveData &&
                typeof saveData === "object" &&
                "error" in saveData &&
                typeof saveData.error === "string"
                ? saveData.error
                : "Could not save your roadmap.",
            );
          }
          setRoadmapStatus("found");
          setRoadmapUserId(user.id);
        } catch (cause) {
          console.error("Could not save the generated roadmap:", cause);
          setError("Your month is ready, but it could not be saved to your account.");
        }
      }
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while building your month.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DesktopFrame>
      {!curriculum ? (
        user && roadmapStatus === "loading" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="retro-dialog-stage"
          >
            <RetroWindow title="Opening your learning desktop..." icon="💾" className="retro-dialog-window">
              <div className="retro-content-loading" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Checking your saved month...
              </div>
            </RetroWindow>
          </motion.div>
        ) : (
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
        )
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
                <RetroButton variant="lime" onClick={() => startWeekOne("roadmap")}>
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
      ) : screen === "dashboard" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="retro-dashboard"
        >
          <div className="retro-dashboard-topline">
            <p><span className="retro-blink-dot" /> YOUR PERSONAL LEARNING DESKTOP</p>
            <span>MONTH FILE: {new Date().toLocaleDateString("en", { month: "short", year: "numeric" }).toUpperCase()}</span>
          </div>

          {error && <p role="alert" className="retro-error">{error}</p>}
          {progressError && <p role="alert" className="retro-error">{progressError}</p>}

          <button
            type="button"
            className="retro-billboard"
            onClick={() => setScreen("review")}
            aria-label={`Open full roadmap for ${curriculum.theme}`}
          >
            <span className="retro-billboard-tape" aria-hidden="true" />
            <span className="retro-billboard-sticker" aria-hidden="true">✦</span>
            <span className="retro-billboard-eyebrow">THIS MONTH&apos;S OBSESSION</span>
            <span className="retro-billboard-theme">{curriculum.theme}</span>
            <span className="retro-billboard-goal">{curriculum.goal}</span>
            <span className="retro-billboard-link">OPEN THE WHOLE ROADMAP <ArrowUpRight /></span>
            <span className="retro-billboard-post" aria-hidden="true" />
          </button>

          <div className="retro-dashboard-section-heading">
            <div>
              <p className="retro-dashboard-label">YOUR DESKTOP / FILES</p>
              <h2>Your four-week journey</h2>
            </div>
            <span className="retro-dashboard-section-note">4 FOLDERS · ONE BIG IDEA</span>
          </div>

          <div className="retro-folder-grid">
            {curriculum.weeks.slice(0, 4).map((week, index) => {
              const isWeekOne = index === 0;
              const isWeekTwoUnlocked = index === 1 && weekOneComplete;
              const isLocked = index > 1 || (index === 1 && !weekOneComplete);
              const topicCount = isWeekOne ? weekOneTopics.length : week.subtopics.length;
              const completedCount = isWeekOne ? completedTopicIndexes.length : 0;
              const folderContent = (
                <>
                  <span className="retro-folder-tab">
                    <span>WEEK {String(week.week).padStart(2, "0")}</span>
                    {isLocked ? <LockKeyhole aria-hidden="true" /> : <span aria-hidden="true">✦</span>}
                  </span>
                  <span className="retro-folder-paper">
                    <span className="retro-folder-title">{week.title}</span>
                    {isLocked ? (
                      <span className="retro-folder-state">LOCKED FOR NOW</span>
                    ) : isWeekTwoUnlocked ? (
                      <span className="retro-folder-state">UNLOCKED · ROADMAP</span>
                    ) : (
                      <span className="retro-folder-count">
                        {progressLoading ? "SYNCING..." : `${completedCount}/${topicCount} TOPICS`}
                      </span>
                    )}
                    <span className="retro-folder-subtopics">
                      {week.subtopics.slice(0, 3).join(" · ")}
                    </span>
                  </span>
                  <span className="retro-folder-shadow" aria-hidden="true" />
                </>
              );

              return (
                <button
                  key={week.week}
                  type="button"
                  className={`retro-folder retro-folder-${index + 1} ${isLocked ? "retro-folder-locked" : ""}`}
                  disabled={isLocked}
                  onClick={() => {
                    if (isWeekOne) startWeekOne("dashboard");
                    else setScreen("review");
                  }}
                  aria-label={
                    isLocked
                      ? `Week ${week.week}: ${week.title}, locked`
                      : isWeekOne
                        ? `Open Week ${week.week}: ${week.title}`
                        : `Open the roadmap at Week ${week.week}: ${week.title}`
                  }
                >
                  {folderContent}
                </button>
              );
            })}
          </div>

          <div className="retro-dashboard-bottom-grid">
            <section className="retro-next-up">
              <div className="retro-next-up-doodle" aria-hidden="true">✦</div>
              <p className="retro-dashboard-label">NEXT UP / {weekOneComplete ? "UNLOCKED" : "READY WHEN YOU ARE"}</p>
              <h2>
                Week {String(weekOneComplete ? (curriculum.weeks[1]?.week ?? 2) : (weekOne?.week ?? 1)).padStart(2, "0")}
                <span> · </span>
                {weekOneComplete ? (curriculum.weeks[1]?.title ?? "Next week") : (weekOne?.title ?? "Week 1")}
              </h2>
              <p className="retro-next-up-progress">
                {progressLoading
                  ? "Syncing your progress..."
                  : weekOneComplete
                    ? "Week 1 complete · Week 2 is unlocked in your roadmap"
                    : `${completedTopicIndexes.length}/${weekOneTopics.length} topics complete`}
              </p>
              <button
                type="button"
                className="retro-dashboard-action"
                disabled={progressLoading || weekOneTopics.length === 0}
                onClick={() =>
                  weekOneComplete ? setScreen("review") : startWeekOne("dashboard")
                }
              >
                {weekOneComplete ? "OPEN FULL ROADMAP" : "OPEN WEEK 01"} <ArrowRight aria-hidden="true" />
              </button>
            </section>

            <button
              type="button"
              className="retro-calendar-card"
              onClick={() => setCalendarOpen(true)}
              aria-haspopup="dialog"
            >
              <span className="retro-calendar-tape" aria-hidden="true" />
              <span className="retro-calendar-heading">
                <span>
                  <span className="retro-dashboard-label">SHOWING UP / LITTLE BY LITTLE</span>
                  <strong>DAILY CHECK-IN</strong>
                </span>
                <CalendarDays aria-hidden="true" />
              </span>
              <span className="retro-calendar-month">
                {calendarMonth.toLocaleDateString("en", { month: "long", year: "numeric" })}
              </span>
              <span className="retro-calendar-grid" aria-hidden="true">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`} className="retro-calendar-weekday">{day}</span>
                ))}
                {dashboardCalendarDays.map((day, index) => {
                  const dateKey = day
                    ? `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : "";
                  return (
                    <span
                      key={`calendar-${index}`}
                      className={`retro-calendar-day ${day ? "" : "retro-calendar-day-blank"} ${completedTopicDates.includes(dateKey) ? "retro-calendar-day-active" : ""}`}
                    >
                      {day ?? ""}
                      {day && completedTopicDates.includes(dateKey) && <i>★</i>}
                    </span>
                  );
                })}
              </span>
              <span className="retro-calendar-footnote">
                {calendarMonthCompletionCount
                  ? `${calendarMonthCompletionCount} saved topic completion day${calendarMonthCompletionCount === 1 ? "" : "s"} this month`
                  : "No completed-topic dates this month yet"}
                <span>VIEW CALENDAR →</span>
              </span>
            </button>
          </div>

          {calendarOpen && (
            <div
              className="retro-calendar-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setCalendarOpen(false);
              }}
            >
              <section
                className="retro-calendar-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="retro-calendar-dialog-title"
              >
                <div className="retro-calendar-dialog-bar">
                  <span>ONE THING / CHECK-IN CALENDAR</span>
                  <button type="button" onClick={() => setCalendarOpen(false)} aria-label="Close calendar">×</button>
                </div>
                <div className="retro-calendar-dialog-heading">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft />
                  </button>
                  <h2 id="retro-calendar-dialog-title">
                    {calendarMonth.toLocaleDateString("en", { month: "long", year: "numeric" })}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight />
                  </button>
                </div>
                <p className="retro-calendar-explanation">
                  Stars mark days when a Week 1 topic was saved as complete. This is completion history, not a separate daily check-in tracker.
                </p>
                <div className="retro-calendar-grid retro-calendar-grid-large">
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, index) => (
                    <span key={`${day}-${index}`} className="retro-calendar-weekday">{day}</span>
                  ))}
                  {dashboardCalendarDays.map((day, index) => {
                    const dateKey = day
                      ? `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      : "";
                    const active = completedTopicDates.includes(dateKey);
                    return (
                      <span
                        key={`calendar-detail-${index}`}
                        className={`retro-calendar-day ${day ? "" : "retro-calendar-day-blank"} ${active ? "retro-calendar-day-active" : ""}`}
                      >
                        {day ?? ""}
                        {active && <i>★</i>}
                      </span>
                    );
                  })}
                </div>
                <p className="retro-calendar-detail-count">
                  {calendarMonthCompletionCount} completion days shown
                </p>
              </section>
            </div>
          )}
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
                <RetroButton
                  onClick={() => {
                    clearTopicQuestion();
                    setScreen(
                      learningReturnScreen === "dashboard" ? "dashboard" : "review",
                    );
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {learningReturnScreen === "dashboard" ? "Back to desktop" : "Back to roadmap"}
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
                    <RetroButton
                      onClick={() => {
                        if (notesMessage) setNotesTopicIndex(null);
                        else void deferNotesPrompt();
                      }}
                      disabled={notesSaving}
                    >
                      {notesMessage ? "Done" : "Maybe later"}
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
