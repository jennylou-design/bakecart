
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: "http://192.168.68.105:3000/auth/confirm",
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setMessage(
        "Registration successful! Please check your email and click the confirmation link to activate your account."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
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
          Create Account
        </h1>
        <p className="mt-2 text-sm text-[#8b7b70]">
          Join BakeCart and enjoy freshly baked treats.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Full Name
          </label>
          <input
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your full name"
            className="w-full rounded-lg border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#7a5443]"
          />
        </div>

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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#7a5443]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Confirm Password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm your password"
            className="w-full rounded-lg border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#7a5443]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7a5443] py-3 font-medium text-white hover:bg-[#654536] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#8b7b70]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#7a5443]"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
