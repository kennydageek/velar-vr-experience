import { StoryExperience } from "@/components/StoryExperience";

const specs = [
  ["Range", "760 km"],
  ["0-100", "2.9s"],
  ["Peak Output", "980 hp"],
  ["Charge 10-80%", "18 min"],
] as const;

export default function Home() {
  return (
    <main className="bg-[#020308] text-white">
      <StoryExperience />

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-6 py-16 md:grid-cols-4 md:px-10">
        {specs.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs tracking-[0.15em] text-white/60">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 md:p-12">
          <p className="text-xs tracking-[0.25em] text-cyan-200/80">RESERVE NOW</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            Step into the next electric chapter.
          </h2>
          <p className="mt-5 max-w-2xl text-white/72">
            Join the early access list for launch pricing, private previews, and invitation-only test drives.
          </p>
          <button className="mt-7 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-cyan-100">
            Join Priority List
          </button>
        </div>
      </section>
    </main>
  );
}
