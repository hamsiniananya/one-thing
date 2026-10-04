"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthMode = "signup" | "login";
type AuthContextValue = {
  user: User | null;
  supabase: SupabaseClient;
  openAuth: (mode?: AuthMode) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [callbackError, setCallbackError] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("auth_error");
    if (!error) return;

    startTransition(() => {
      setCallbackError("Google sign-in could not be completed. Please try again.");
      setMode("login");
      setModalOpen(true);
    });

    params.delete("auth_error");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }, []);

  const openAuth = useCallback((authMode: AuthMode = "login") => {
    setCallbackError("");
    setMode(authMode);
    setModalOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, supabase, openAuth, signOut }),
    [user, supabase, openAuth, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {modalOpen && (
        <AuthModal
          key={callbackError}
          mode={mode}
          onModeChange={(nextMode) => {
            setCallbackError("");
            setMode(nextMode);
          }}
          onClose={() => setModalOpen(false)}
          supabase={supabase}
          initialError={callbackError}
        />
      )}
    </AuthContext.Provider>
  );
}

export function AuthControls() {
  const { user, openAuth, signOut } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    setError("");
    try {
      await signOut();
    } catch (cause) {
      console.error("Supabase sign out failed:", cause);
      setError("Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="retro-auth-controls">
      {user ? (
        <>
          <span className="retro-auth-email" title={user.email ?? undefined}>
            <span className="retro-auth-led" aria-hidden="true" />
            {user.email}
          </span>
          <button
            type="button"
            className="retro-auth-button"
            onClick={handleSignOut}
            disabled={busy}
          >
            {busy ? "Signing out..." : "Log out"}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="retro-auth-button"
            onClick={() => openAuth("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className="retro-auth-button retro-auth-button-signup"
            onClick={() => openAuth("signup")}
          >
            Sign up
          </button>
        </>
      )}
      {error && <span role="alert" className="retro-auth-inline-error">{error}</span>}
    </div>
  );
}

function AuthModal({
  mode,
  onModeChange,
  onClose,
  supabase,
  initialError,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  supabase: SupabaseClient;
  initialError: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  const preserveFlowOnReturn = () => {
    window.sessionStorage.setItem("one-thing-auth-return", "true");
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        preserveFlowOnReturn();
        const redirectTo = new URL("/auth/callback", window.location.origin);
        redirectTo.searchParams.set(
          "next",
          `${window.location.pathname}${window.location.search}`,
        );
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo.toString() },
        });
        if (authError) throw authError;

        if (data.session) {
          onClose();
        } else {
          setMessage("Check your email for a confirmation link to finish signing up.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        onClose();
      }
    } catch (cause) {
      console.error(`Supabase ${isSignup ? "sign up" : "sign in"} failed:`, cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      preserveFlowOnReturn();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set(
        "next",
        `${window.location.pathname}${window.location.search}`,
      );
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (authError) throw authError;
    } catch (cause) {
      console.error("Supabase Google sign-in failed:", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Google sign-in could not be started. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="retro-auth-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="retro-window retro-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <div className="retro-titlebar">
          <span className="retro-title-icon" aria-hidden="true">🔐</span>
          <span className="min-w-0 flex-1 truncate">
            {isSignup ? "Create your One Thing account" : "Log in to One Thing"}
          </span>
          <button
            type="button"
            className="retro-window-control"
            aria-label="Close sign in"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="retro-window-body">
          <div className="retro-auth-intro">
            <p className="retro-step-number">ONE THING MEMBER ACCESS</p>
            <h2 id="auth-dialog-title">
              {isSignup ? "Save your curiosity." : "Welcome back."}
            </h2>
            <p>
              {isSignup
                ? "Make an account to keep your learning journey close."
                : "Log in and pick up right where your curiosity left off."}
            </p>
          </div>

          <button
            type="button"
            className="retro-auth-google"
            onClick={handleGoogleAuth}
            disabled={busy}
          >
            <span className="retro-google-mark" aria-hidden="true">G</span>
            Continue with Google
          </button>

          <div className="retro-auth-divider"><span>OR USE YOUR EMAIL</span></div>

          <form onSubmit={handleEmailAuth}>
            <label className="retro-label" htmlFor="auth-email">EMAIL ADDRESS</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="retro-input"
              placeholder="you@example.com"
            />
            <label className="retro-label" htmlFor="auth-password">
              PASSWORD
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="retro-input"
              placeholder="At least 6 characters"
            />
            {error && <p role="alert" className="retro-error">{error}</p>}
            {message && <p role="status" className="retro-auth-message">{message}</p>}
            <button type="submit" className="retro-button retro-button-primary retro-auth-submit" disabled={busy}>
              {busy
                ? "PLEASE WAIT..."
                : isSignup
                  ? "CREATE ACCOUNT"
                  : "LOG IN"}
            </button>
          </form>

          <p className="retro-auth-switch">
            {isSignup ? "Already have an account?" : "New to One Thing?"}{" "}
            <button
              type="button"
              onClick={() => onModeChange(isSignup ? "login" : "signup")}
            >
              {isSignup ? "Log in" : "Sign up"}
            </button>
          </p>
          <div className="retro-window-status">
            <span><span className="retro-status-led" /> SECURE CONNECTION</span>
            <span>ONE THING AUTH.EXE</span>
          </div>
        </div>
      </section>
    </div>
  );
}
