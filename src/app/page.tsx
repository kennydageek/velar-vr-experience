import { Hero } from "@/components/Hero";

const specs = [
  { label: "Range", value: "760 km" },
  { label: "0-100", value: "2.9s" },
  { label: "Top Speed", value: "320 km/h" },
  { label: "Charge 10-80%", value: "18 min" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#03050b] text-white">
      <Hero />

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-6 py-16 md:grid-cols-4 md:px-10">
        {specs.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs tracking-[0.15em] text-white/60">{s.label}</p>
            <p className="mt-3 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 md:p-12">
          <p className="text-xs tracking-[0.25em] text-cyan-200/80">AERODYNAMIC INTELLIGENCE</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            Precision airflow meets digital control to deliver instant confidence.
          </h2>
          <p className="mt-5 max-w-2xl text-white/72">
            Every curve is shaped for drag reduction and thermal balance, giving the vehicle
            extraordinary range without sacrificing visual drama.
          </p>
        </div>
      </section>
    </main>
  );
}
