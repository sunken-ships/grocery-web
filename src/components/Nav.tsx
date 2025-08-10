"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/demo", label: "Demo" },
];

export default function Nav() {
  const pathname = usePathname();

  const getLinkClasses = (href: string): string => {
    const base = " text-sm uppercase font-bold";
    const active = "underline underline-offset-2 decoration-2";
    const inactive = "hover:underline underline-offset-2";
    return [base, pathname === href ? active : inactive].join(" ");
  };

  return (
    <nav
      className="m-4 flex items-center justify-between px-2 md:px-8"
      aria-label="Primary"
    >
      <div className="flex items-center gap-2">
        <Image
          src="/ship.svg"
          alt="Shunken Ship"
          width={40}
          height={40}
          className="-rotate-45 border-2 border-white p-2 rounded-full shadow-lg"
        />
        <div className="hidden md:block">
          {navLinks.map(({ href, label }) => (
            <Link href={href} key={href}>
              <h1 className={getLinkClasses(href)}>{label}</h1>
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <h1 className="text-xs md:text-2xl font-light ">
          <span className="font-semibold">CODE NAME</span>:// SUNKEN SHIP
        </h1>
        <div className="flex flex-row gap-2 md:hidden">
          {navLinks.map(({ href, label }) => (
            <Link href={href} key={href}>
              <h1 className={getLinkClasses(href)}>{label}</h1>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
