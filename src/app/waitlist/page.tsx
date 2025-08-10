"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import GridSignup from "./GridSignup";

export default function Waitlist() {
  const [email, setEmail] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalSignups = useQuery(api.waitlist.getWaitlistCount, {});
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");
    setIsSubmitting(true);
    try {
      const trimmed = email.trim();
      if (!trimmed) {
        setStatusMessage("Please enter a valid email.");
        return;
      }
      const result = await joinWaitlist({ email: trimmed });
      setStatusMessage(result.message);
      setEmail("");
    } catch (error) {
      console.error(error);
      setStatusMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const signupCountText = useMemo(() => {
    if (totalSignups === undefined) return "Loading...";
    return `${totalSignups} ${
      totalSignups === 1 ? "person" : "people"
    } signed up`;
  }, [totalSignups]);

  return (
    <div className="flex flex-col min-h-screen ">
      <Nav />
      <GridSignup />
      <div className="flex flex-col justify-center w-sm md:w-xl mx-auto text-left my-4 px-4">
        <div className="bg-black/10 px-4 py-2 rounded-lg w-min font-semibold whitespace-nowrap self-center">
          COMING SOON
        </div>
        <h1 className="text-2xl md:text-3xl font-light self-center mt-2">
          Join the Waitlist
        </h1>
        <p className="text-md md:text-lg font-light self-center">
          Eat Better, Waste Less, Spend Smarter.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4">
          <label htmlFor="email">
            We are working hard on Forehj. Sign up to get notified when we
            launch.
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded-lg border-2 border-gray-300 font-bold"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-foreground text-background p-2 rounded-lg text-sm uppercase font-bold hover:bg-foreground/80 transition-all duration-300 hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Get Notified"}
          </button>
          <div className="flex justify-between items-center text-sm text-white/70">
            <p>{statusMessage || ""}</p>
            <p>{signupCountText}</p>
          </div>
        </form>
      </div>
    </div>
  );
}
