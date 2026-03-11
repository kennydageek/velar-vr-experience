'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const products = [
  { name: 'Aether Runner', price: '$149', tag: 'New', hue: 'from-cyan-400 to-blue-600' },
  { name: 'Nova Jacket', price: '$219', tag: 'Best Seller', hue: 'from-fuchsia-400 to-violet-600' },
  { name: 'Flux Headset', price: '$179', tag: 'Limited', hue: 'from-amber-400 to-orange-600' },
];

export function EcommerceLanding() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const t = useMemo(() => {
    if (theme === 'dark') {
      return {
        bg: 'bg-[#05070b]',
        text: 'text-white',
        soft: 'text-white/70',
        card: 'bg-white/[0.05] border-white/10',
        glow: 'from-cyan-500/20 via-violet-500/10 to-fuchsia-500/20',
      };
    }

    return {
      bg: 'bg-[#f7f8fc]',
      text: 'text-[#111827]',
      soft: 'text-black/60',
      card: 'bg-white border-black/10',
      glow: 'from-cyan-400/20 via-violet-400/10 to-fuchsia-400/20',
    };
  }, [theme]);

  return (
    <main className={`min-h-screen transition-colors duration-500 ${t.bg} ${t.text}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.glow}`} />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <div className="text-sm font-semibold tracking-[0.35em]">NEXUS STORE</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`rounded-full border px-4 py-2 text-xs tracking-[0.2em] ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}
          >
            {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
          </button>
          <Link href="/drive" className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold tracking-[0.15em] text-white">
            DEMO DRIVE
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-6 pb-12 pt-8 md:grid-cols-2 md:px-10 md:pt-14">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className={`text-xs tracking-[0.3em] ${t.soft}`}>PREMIUM ECOMMERCE EXPERIENCE</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-7xl">
            Sell with speed.
            <br />
            Convert with motion.
          </h1>
          <p className={`mt-5 max-w-xl text-sm md:text-base ${t.soft}`}>
            A high-converting storefront built with immersive interactions, animated product storytelling, and seamless light/dark experiences.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">Shop Collection</button>
            <button className={`rounded-full border px-6 py-3 text-sm ${theme === 'dark' ? 'border-white/30' : 'border-black/20'}`}>Watch Story</button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className={`relative overflow-hidden rounded-3xl border p-6 md:p-8 ${t.card}`}
          whileHover={{ y: -6 }}
        >
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="relative space-y-5">
            {products.map((p, i) => (
              <motion.div
                key={p.name}
                className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-black/30' : 'border-black/10 bg-white/90'}`}
                whileHover={{ scale: 1.02, x: 3 }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className={`text-xs ${t.soft}`}>{p.tag}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${p.hue}`} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-medium">{p.price}</p>
                  <button className="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-semibold text-white">ADD</button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-4 px-6 pb-16 md:grid-cols-3 md:px-10">
        {[
          ['Lightning Checkout', 'One-tap checkout animations guide users to conversion in under 20 seconds.'],
          ['Smart Recommendations', 'Interactive cards adapt live to user behavior with fluid transitions.'],
          ['Brand-First Motion', 'Microinteractions make every hover, tap, and scroll feel premium.'],
        ].map(([title, body]) => (
          <motion.article key={title} whileHover={{ y: -6 }} className={`rounded-2xl border p-5 ${t.card}`}>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className={`mt-2 text-sm ${t.soft}`}>{body}</p>
          </motion.article>
        ))}
      </section>
    </main>
  );
}
