import Nav from "@/components/Nav";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen ">
      <Nav />

      {/* Main Content */}
      <div className="flex flex-col justify-center w-sm md:w-xl mx-auto text-left p-4 flex-grow">
        <h1 className="font-bold md:text-3xl text-xl">Forehj (noun)</h1>
        <h2 className="text-xl md:text-2xl font-light text-red-200">
          /fôr-ij/
        </h2>
        <ul className="space-y-4 mt-4 list-decimal list-inside text-xl md:text-2xl font-light">
          <li>
            A smart planning system that transforms your budget, pantry, and
            preferences into optimized, real-world grocery and meal plans.
          </li>
          <li>
            A tool for reclaiming control over how you eat, built for real
            kitchens, real constraints, and real people.
          </li>
          <li>It&apos;s not just software, it&apos;s food empowerment.</li>
        </ul>
      </div>
    </div>
  );
}
