
"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") === "confirmation_failed"
      ? "Email confirmation failed. Please try again."
      : ""
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError || !data.user) {
        setError(
          loginError?.message || "Unable to sign in. Please try again."
        );
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError(
          "Your account profile could not be found. Please contact support."
        );
        return;
      }

      if (profile.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#eadfd5] bg-white p-8 shadow-sm">
      <div className="mb-7 text-center">
        <h1 className="text-3xl font-semibold text-[#3d3029]">
          Welcome Back
        </h1>
        <p className="mt-2 text-sm text-[#8b7b70]">
          Sign in to continue to BakeCart.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Email Address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#7a5443]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#7a5443]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7a5443] py-3 font-medium text-white hover:bg-[#654536] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#8b7b70]">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#7a5443]"
        >
          Create Account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-8 text-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
