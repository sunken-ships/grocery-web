"use client";
import Nav from "@/components/Nav";
import React from "react";

import {
  SignInButton,
  SignUpButton,
  UserButton,
  SignOutButton,
} from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";

export default function AccountPage() {
  return (
    <div className="flex flex-col h-screen">
      <Nav />
      <div className="flex flex-col mx-8 my-4">
        <Unauthenticated>
          <SignInButton />
          <SignUpButton>
            <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
              Sign Up
            </button>
          </SignUpButton>
        </Unauthenticated>
        <Authenticated>
          <div className="flex flex-row gap-2 items-center">
            <p>Welcome</p>
            <UserButton />
            <SignOutButton />
          </div>
        </Authenticated>
      </div>
    </div>
  );
}
