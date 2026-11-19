import { createFileRoute, redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { loadLoginState } from "../diary.functions";

// Not linked from anywhere and excluded from indexing. Access is enforced on the server,
// so knowing this path grants nothing without the owner's GitHub account.
export const Route = createFileRoute("/login")({
  loader: async () => {
    const state = await loadLoginState();
    if (state.isOwner) throw redirect({ to: "/" });
    return state;
  },
  head: () => ({
    meta: [{ title: "Ryan's Diary" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: LoginPage,
});

const authClient = createAuthClient();

function LoginPage() {
  const { configured } = Route.useLoaderData();
  const [pending, setPending] = useState(false);
  const failed =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("error");

  const signIn = async () => {
    setPending(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
      errorCallbackURL: "/login",
    });
  };

  return (
    <main className="parchment-screen">
      <div className="parchment-card">
        <p className="font-hand text-3xl text-ink-soft">Only the keeper may write here.</p>
        {configured ? (
          <button type="button" className="ink-button mt-8" onClick={signIn} disabled={pending}>
            {pending ? "Opening GitHub…" : "Sign in with GitHub"}
          </button>
        ) : (
          <p className="mt-6 font-story text-lg text-ink">
            Sign-in is not configured. Add the GitHub OAuth values to .dev.vars.
          </p>
        )}
        {failed ? (
          <p role="alert" className="mt-5 font-story text-base text-wax">
            That account cannot open this diary.
          </p>
        ) : null}
        <a className="mt-8 block font-hand text-2xl text-ink-soft underline" href="/">
          Back to the diary
        </a>
      </div>
    </main>
  );
}
