import { useState, type FormEvent } from "react";
import { signIn } from "./auth";
import "./login-form.css";

type LoginStatus = "logged-out" | "pending" | "failed";

interface LoginFormProps {
  onAuthenticated: () => void;
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [status, setStatus] = useState<LoginStatus>("logged-out");
  const isPending = status === "pending";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setStatus("pending");

    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const authenticated =
      typeof email === "string" &&
      typeof password === "string" &&
      (await signIn(email, password));

    if (authenticated) {
      onAuthenticated();
      return;
    }

    setStatus("failed");
  }

  return (
    <main className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <p>Use your demo account to continue.</p>

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={isPending}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
        />

        {status === "failed" ? (
          <p className="login-error">Sign-in failed. Check your details and try again.</p>
        ) : null}

        <button type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
