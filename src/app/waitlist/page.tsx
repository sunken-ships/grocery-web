import React from "react";
import Nav from "@/components/Nav";

export default function Waitlist() {
  return (
    <div className="flex flex-col min-h-screen ">
      <Nav />
      <div className="flex flex-col justify-center w-sm md:w-xl mx-auto text-left p-4 space-y-2">
        <div className="bg-black/10 px-4 py-2 rounded-lg w-min font-semibold whitespace-nowrap self-center">
          COMING SOON
        </div>
        <h1 className="text-2xl md:text-3xl font-light self-center mt-2">
          Join the Waitlist
        </h1>
        <p className="text-md md:text-lg font-light self-center">
          Eat Better, Waste Less, Spend Smarter.
        </p>
        <form action="" className="flex flex-col gap-2 mt-8">
          <label htmlFor="email">
            We are workgin hard on Forehj. Sign up to get notified when we
            launch.
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            required
            className="w-full p-2 rounded-lg border-2 border-gray-300 font-bold"
          />
          <button
            type="submit"
            className="bg-foreground text-background p-2 rounded-lg text-sm uppercase font-bold hover:bg-foreground/80 transition-all duration-300 hover:cursor-pointer"
          >
            Get Notified
          </button>
          <p className="text-sm text-white/50">.</p>
        </form>
      </div>
    </div>
  );
}
