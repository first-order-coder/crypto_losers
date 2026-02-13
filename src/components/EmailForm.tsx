"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/email-losers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          limit: 50,
          minQuoteVolume: 1_000_000,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      toast.success("Snapshot sent! Check your inbox.");
      setEmail("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
        className="max-w-xs"
      />
      <Button type="submit" disabled={loading} size="sm">
        {loading ? "Sending…" : "Email me the losers"}
      </Button>
    </form>
  );
}
