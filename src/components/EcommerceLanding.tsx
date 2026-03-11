'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const products = [
  { name: 'Aether Runner', price: '$149', oldPrice: '$189', tag: 'New', hue: 'from-cyan-400 to-blue-600', category: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80' },
  { name: 'Nova Jacket', price: '$219', oldPrice: '$269', tag: 'Best Seller', hue: 'from-fuchsia-400 to-violet-600', category: 'Outerwear', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80' },
  { name: 'Flux Headset', price: '$179', oldPrice: '$229', tag: 'Limited', hue: 'from-amber-400 to-orange-600', category: 'Audio', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80' },
  { name: 'Orbit Glasses', price: '$129', oldPrice: '$159', tag: 'Trending', hue: 'from-emerald-400 to-teal-600', category: 'Wearables', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80' },
  { name: 'Pulse Hoodie', price: '$99', oldPrice: '$129', tag: 'Sale', hue: 'from-rose-400 to-pink-600', category: 'Apparel', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80' },
  { name: 'Neo Watch', price: '$249', oldPrice: '$299', tag: 'Premium', hue: 'from-indigo-400 to-blue-700', category: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80' },
];

export function EcommerceLanding() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [cartCount, setCartCount] = useState(0);
  const [activeProduct, setActiveProduct] = useState<(typeof products)[number] | null>(null);
  const [tryOnSession, setTryOnSession] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');

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

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 1800);
    return () => window.clearTimeout(id);
  }, [notice]);

  const addToCart = (name: string) => {
    setCartCount((v) => v + 1);
    setNotice(`${name} added to cart`);
  };

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
          <button
            onClick={() => setNotice(`Cart has ${cartCount} item${cartCount === 1 ? '' : 's'}`)}
            className={`rounded-full border px-4 py-2 text-xs tracking-[0.15em] ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}
          >
            CART ({cartCount})
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
            <button onClick={() => setNotice('Opened collection')} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">Shop Collection</button>
            <button onClick={() => setNotice('Playing brand story')} className={`rounded-full border px-6 py-3 text-sm ${theme === 'dark' ? 'border-white/30' : 'border-black/20'}`}>Watch Story</button>
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
            {products.slice(0, 3).map((p, i) => (
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
                    <p className={`text-xs ${t.soft}`}>{p.tag} · {p.category}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${p.hue}`} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-medium">{p.price} <span className={`ml-1 text-xs line-through ${t.soft}`}>{p.oldPrice}</span></p>
                  <button onClick={() => addToCart(p.name)} className="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-semibold text-white">ADD</button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-8 md:px-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className={`text-xs tracking-[0.25em] ${t.soft}`}>DUMMY PRODUCT CATALOG</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-4xl">Featured Products + Pricing</h2>
          </div>
          <button onClick={() => setNotice('Showing all products')} className={`rounded-full border px-4 py-2 text-xs ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}>View All</button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {products.map((p) => (
            <motion.article key={p.name} whileHover={{ y: -8 }} className={`rounded-2xl border p-5 ${t.card}`}>
              <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <p className={`text-xs ${t.soft}`}>{p.category}</p>
              <h3 className="mt-1 text-lg font-semibold">{p.name}</h3>
              <p className={`mt-1 text-xs ${t.soft}`}>{p.tag}</p>
              <div className="mt-3 flex items-center gap-2">
                <p className="text-lg font-semibold">{p.price}</p>
                <p className={`text-sm line-through ${t.soft}`}>{p.oldPrice}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => addToCart(p.name)} className="rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white">Add to Cart</button>
                <button onClick={() => setActiveProduct(p)} className={`rounded-full border px-3 py-1.5 text-xs ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}>Quick View</button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-10 md:px-10">
        <motion.div whileHover={{ y: -4 }} className={`rounded-3xl border p-6 md:p-8 ${t.card}`}>
          <p className={`text-xs tracking-[0.25em] ${t.soft}`}>VIRTUAL TRY-ON</p>
          <h3 className="mt-2 text-2xl font-semibold md:text-4xl">Try products live before checkout</h3>
          <p className={`mt-3 max-w-2xl text-sm ${t.soft}`}>
            Simulate fitting for glasses, sneakers, and jackets with camera-assisted overlays and size previews.
            This demo uses dummy products with realistic pricing + virtual try-on CTA flow.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {['Try Glasses in AR', 'Try Sneakers On-Foot', 'Try Jacket on Avatar'].map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  setTryOnSession(label);
                  setNotice(`${label} started`);
                }}
                className={`rounded-2xl border p-4 text-left transition hover:scale-[1.02] ${theme === 'dark' ? 'border-white/15 bg-black/30' : 'border-black/10 bg-white/90'}`}
              >
                <p className="text-sm font-semibold">{label}</p>
                <p className={`mt-1 text-xs ${t.soft}`}>Session {i + 1} · Ready</p>
              </button>
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

      {activeProduct && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4" onClick={() => setActiveProduct(null)}>
          <div className={`w-full max-w-xl rounded-3xl border p-5 ${t.card}`} onClick={(e) => e.stopPropagation()}>
            <div className="relative h-52 w-full overflow-hidden rounded-2xl">
              <Image src={activeProduct.image} alt={activeProduct.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
            </div>
            <p className={`mt-3 text-xs ${t.soft}`}>{activeProduct.category} · {activeProduct.tag}</p>
            <h3 className="mt-1 text-2xl font-semibold">{activeProduct.name}</h3>
            <p className={`mt-2 ${t.soft}`}>Premium dummy product for demo storefront interactions and quick-buy workflow.</p>
            <div className="mt-4 flex items-center gap-3">
              <p className="text-xl font-semibold">{activeProduct.price}</p>
              <p className={`text-sm line-through ${t.soft}`}>{activeProduct.oldPrice}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => addToCart(activeProduct.name)} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white">Add to Cart</button>
              <button onClick={() => setTryOnSession(`Try ${activeProduct.name}`)} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}>Virtual Try-On</button>
              <button onClick={() => setActiveProduct(null)} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {tryOnSession && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4" onClick={() => setTryOnSession(null)}>
          <div className={`w-full max-w-2xl rounded-3xl border p-5 ${theme === 'dark' ? 'border-white/15 bg-[#0b0f17]' : 'border-black/10 bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <p className={`text-xs tracking-[0.2em] ${t.soft}`}>LIVE TRY-ON SESSION</p>
            <h3 className="mt-2 text-2xl font-semibold">{tryOnSession}</h3>
            <div className={`mt-4 h-64 rounded-2xl border ${theme === 'dark' ? 'border-cyan-300/25 bg-[#070b12]' : 'border-black/10 bg-white/90'} flex items-center justify-center`}>
              <div className="text-center">
                <p className={`text-sm ${t.soft}`}>Camera preview placeholder · model alignment active</p>
                <p className={`mt-1 text-xs ${t.soft}`}>Grant camera access to enable real try-on rendering</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setNotice('Snapshot saved to fitting session')} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white">Capture Fit</button>
              <button onClick={() => setNotice('Size recommendation generated')} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25 bg-white/5' : 'border-black/20'}`}>Suggest Size</button>
              <button onClick={() => setTryOnSession(null)} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25 bg-white/5' : 'border-black/20'}`}>End Session</button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-5 right-5 z-40 rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {notice}
        </div>
      )}
    </main>
  );
}
