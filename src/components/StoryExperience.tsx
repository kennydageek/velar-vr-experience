"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ExperienceScene } from "./ExperienceScene";

type FocusKey = "power" | "battery" | "aero";

const slides = [
  {
    tag: "PERFORMANCE CORE",
    title: "Instant torque delivery. Zero hesitation.",
    body: "Twin-motor orchestration translates intent into precision at every speed envelope.",
  },
  {
    tag: "BATTERY INTELLIGENCE",
    title: "Adaptive thermal logic for relentless range.",
    body: "Real-time balancing and route-aware conditioning keep performance stable from city to highway.",
  },
  {
    tag: "AERODYNAMIC SYSTEM",
    title: "Body surfaces that negotiate airflow in motion.",
    body: "Controlled pressure zones reduce drag while preserving stance, grip, and visual aggression.",
  },
  {
    tag: "DIGITAL CABIN",
    title: "A cockpit tuned for focus, not noise.",
    body: "Contextual UI and calm motion language ensure every signal is clear at a glance.",
  },
];

export function StoryExperience() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start start", "end end"] });

  const progress = useTransform(scrollYProgress, [0, 1], [0, 0.999]);
  const [p, setP] = useState(0);
  const [focus, setFocus] = useState<FocusKey>("power");
  const [audioOn, setAudioOn] = useState(false);

  useEffect(() => progress.on("change", (v) => setP(v)), [progress]);

  useEffect(() => {
    if (p < 0.33) setFocus("power");
    else if (p < 0.66) setFocus("battery");
    else setFocus("aero");
  }, [p]);

  useEffect(() => {
    if (!audioOn || reducedMotion) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 42;
    gain.gain.value = 0.01;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    return () => {
      osc.stop();
      ctx.close();
    };
  }, [audioOn, reducedMotion]);

  const steps = useMemo(() => Math.max(0, Math.min(3, Math.floor(p * 4))), [p]);

  return (
    <div ref={wrapperRef} className="relative h-[400vh] bg-[#020308] text-white">
      <div className="sticky top-0 h-screen overflow-hidden">
        <ExperienceScene progress={p} focus={focus} reducedMotion={Boolean(reducedMotion)} />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(48,184,255,0.28),transparent_40%),radial-gradient(circle_at_78%_72%,rgba(171,120,255,0.18),transparent_42%)]" />

        <div className="absolute left-0 top-0 z-20 flex w-full items-center justify-between px-6 py-7 md:px-10">
          <div className="text-sm tracking-[0.45em] text-white/85">VELAR</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioOn((s) => !s)}
              className="rounded-full border border-white/25 px-4 py-2 text-[10px] tracking-[0.2em] text-white/80 transition hover:border-white/55"
            >
              {audioOn ? "AUDIO ON" : "AUDIO OFF"}
            </button>
            <button className="rounded-full border border-white/25 px-5 py-2 text-xs tracking-[0.2em] text-white/80 transition hover:border-white/55">
              RESERVE
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-6 z-20 max-w-xl md:left-10">
          <motion.p key={slides[steps].tag} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs tracking-[0.32em] text-cyan-200/85">
            {slides[steps].tag}
          </motion.p>
          <motion.h1 key={slides[steps].title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">
            {slides[steps].title}
          </motion.h1>
          <motion.p key={slides[steps].body} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 max-w-lg text-sm text-white/75 md:text-base">
            {slides[steps].body}
          </motion.p>

          <div className="mt-6 flex flex-wrap gap-2">
            {([
              ["power", "Powertrain"],
              ["battery", "Battery"],
              ["aero", "Aero"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFocus(k)}
                className={`pointer-events-auto rounded-full px-4 py-2 text-xs tracking-[0.14em] transition ${
                  focus === k ? "bg-white text-black" : "border border-white/25 text-white/80 hover:border-white/55"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
