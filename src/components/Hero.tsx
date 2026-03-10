"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HeroScene } from "./HeroScene";

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative h-screen overflow-hidden border-b border-white/10 bg-[#020308]">
      <div className="absolute inset-0">
        <HeroScene reducedMotion={Boolean(reducedMotion)} />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(68,195,255,0.3),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(131,87,255,0.22),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-6 py-10 text-white md:px-10">
        <header className="flex items-center justify-between">
          <div className="text-sm tracking-[0.45em] text-white/78">VELAR</div>
          <button className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.2em] text-white/80 transition hover:border-white/50 hover:text-white">
            RESERVE
          </button>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.7 }}
          className="max-w-2xl space-y-5 pb-10"
        >
          <p className="text-xs tracking-[0.35em] text-cyan-200/80">ELECTRIC GRAND TOURER</p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-7xl">
            Built for silence.
            <br />
            Tuned for impact.
          </h1>
          <p className="max-w-lg text-sm text-white/75 md:text-base">
            A cinematic EV showcase experience inspired by next-gen automotive storytelling.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-100">
              Explore Model
            </button>
            <button className="rounded-full border border-white/35 px-6 py-2.5 text-sm text-white transition hover:border-white hover:bg-white/10">
              View Specs
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
