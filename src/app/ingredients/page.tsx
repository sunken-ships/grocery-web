import Nav from "@/components/Nav";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function IngredientsPage() {
  return (
    <div className="flex flex-col min-h-screen ">
      <Nav />

      <div className="flex flex-col items-center justify-center flex-grow gap-8 mx-auto">
        {/* Search Bar */}
        <form action="/ingredients/search" className="flex flex-row gap-2">
          <input
            type="text"
            name="query"
            placeholder="Search"
            className="rounded-md p-2 border-2 border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 hover:cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 hover:cursor-pointer"
          >
            Clear
          </button>
        </form>

        {/* Create Ingredient Link */}
        <Link
          href="/ingredients/create"
          className="bg-blue-500 text-white p-2 rounded-md hover:bg-green-600 hover:cursor-pointer w-full"
        >
          <div className="flex flex-row items-center justify-between gap-2">
            <PlusIcon className="w-4 h-4" />
            Create Ingredient
          </div>
        </Link>
      </div>
    </div>
  );
}
