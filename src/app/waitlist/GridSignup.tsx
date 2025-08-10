"use client";
import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function GridSignup() {
  const SQUARE_IN_GRID = 48;
  const totalSignups = useQuery(api.waitlist.getWaitlistCount, {});

  const squares = useMemo(() => {
    const filledCount = Math.min(totalSignups ?? 0, SQUARE_IN_GRID);

    const indices = Array.from({ length: SQUARE_IN_GRID }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const filledSet = new Set(indices.slice(0, filledCount));

    return Array.from({ length: SQUARE_IN_GRID }, (_, index) => {
      const isFilled = filledSet.has(index);
      return (
        <div
          key={index}
          className={` rounded-md w-8 h-8 ${
            isFilled ? "bg-blue-500" : " bg-white"
          }`}
        ></div>
      );
    });
  }, [totalSignups]);

  const backgroundSquares = useMemo(() => {
    const overage = Math.max((totalSignups ?? 0) - SQUARE_IN_GRID, 0);
    if (overage === 0) return null;

    // Put a reasonable cap to avoid excessive DOM nodes
    const MAX_BACKGROUND_SQUARES = 150;
    const count = Math.min(overage, MAX_BACKGROUND_SQUARES);

    return Array.from({ length: count }, (_, i) => {
      const top = Math.random() * 100; // percentage within container
      const left = Math.random() * 100; // percentage within container
      return (
        <div
          key={`bg-${i}`}
          className={`absolute rounded-md bg-blue-500/30 pointer-events-none h-6 w-6`}
          style={{
            top: `${top}%`,
            left: `${left}%`,
          }}
        />
      );
    });
  }, [totalSignups]);

  return (
    <div className=" flex flex-col items-center justify-center gap-2 my-4 flex-grow">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {backgroundSquares}
      </div>
      <div className="max-w-sm md:max-w-xl mx-auto">
        <div className="relative z-10 bg-white/20 rounded-md p-2 grid grid-cols-8 md:grid-cols-12 grid-rows-6 md:grid-rows-4 gap-2 place-items-center">
          {squares}
        </div>
      </div>
      <p className="text-sm text-center text-balance ">
        Each blue square represents a person who has signed up for the waitlist
        with in the last 24 hours.
      </p>
    </div>
  );
}
