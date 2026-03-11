'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

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
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryOnProduct, setTryOnProduct] = useState<(typeof products)[number] | null>(null);
  const [overlayX, setOverlayX] = useState(0);
  const [overlayY, setOverlayY] = useState(0);
  const [overlayScale, setOverlayScale] = useState(1);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
  const [generatedTryOn, setGeneratedTryOn] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>('');
  const tryOnInputRef = useRef<HTMLInputElement | null>(null);
  const tryOnVideoRef = useRef<HTMLVideoElement | null>(null);
  const tryOnStreamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => {
    return () => {
      tryOnStreamRef.current?.getTracks().forEach((t) => t.stop());
      tryOnStreamRef.current = null;
    };
  }, []);

  const addToCart = (name: string) => {
    setCartCount((v) => v + 1);
    setNotice(`${name} added to cart`);
  };

  const openTryOn = (label: string, product?: (typeof products)[number]) => {
    setTryOnSession(label);
    setTryOnProduct(product ?? products[0]);
    setGeneratedTryOn(null);
    setOverlayX(0);
    setOverlayY(0);
    setOverlayScale(1);
    setOverlayRotation(0);
    setNotice(`${label} started`);
  };

  const autoAnchorTryOn = useCallback(async (imageUrl: string, product = tryOnProduct) => {
    const category = (product?.category ?? '').toLowerCase();

    if (category.includes('wearables') || category.includes('glasses')) {
      try {
        const Img = window.Image;
        const img = new Img();
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const AnyWin = window as typeof window & {
          FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
            detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>>;
          };
        };

        if (AnyWin.FaceDetector) {
          const fd = new AnyWin.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await fd.detect(img);

          if (faces.length > 0) {
            const f = faces[0].boundingBox;
            const faceCenterX = f.x + f.width * 0.5;
            const eyeLineY = f.y + f.height * 0.34;

            const xPct = ((faceCenterX / img.width) - 0.5) / 0.45 * 100;
            const yPct = ((eyeLineY / img.height) - 0.38) / 0.45 * 100;
            const scale = THREE.MathUtils.clamp((f.width / img.width) * 2.2, 0.55, 1.7);

            setOverlayX(THREE.MathUtils.clamp(xPct, -60, 60));
            setOverlayY(THREE.MathUtils.clamp(yPct, -60, 60));
            setOverlayScale(scale);
            setOverlayRotation(0);
            setNotice('Face detected. Auto-anchored try-on overlay.');
            return;
          }
        }
      } catch {
        // fallback below
      }
    }

    // fallback defaults by category
    if (category.includes('wearables') || category.includes('glasses')) {
      setOverlayX(0);
      setOverlayY(-8);
      setOverlayScale(1.05);
      setOverlayRotation(0);
    } else if (category.includes('outerwear') || category.includes('apparel')) {
      setOverlayX(0);
      setOverlayY(18);
      setOverlayScale(1.35);
      setOverlayRotation(0);
    } else if (category.includes('sneakers')) {
      setOverlayX(6);
      setOverlayY(40);
      setOverlayScale(0.9);
      setOverlayRotation(-8);
    } else {
      setOverlayX(0);
      setOverlayY(0);
      setOverlayScale(1);
      setOverlayRotation(0);
    }
  }, [tryOnProduct]);

  const onUploadTryOnImage = (file?: File | null) => {
    if (!file) {
      setNotice('No image selected.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setNotice('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result);
      setTryOnImage(url);
      await autoAnchorTryOn(url);
      setNotice('Image uploaded. Product attached to preview.');
    };
    reader.onerror = () => setNotice('Could not read image. Try another file.');
    reader.readAsDataURL(file);
  };

  const openTryOnPicker = () => tryOnInputRef.current?.click();

  const startLiveCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      tryOnStreamRef.current?.getTracks().forEach((t) => t.stop());
      tryOnStreamRef.current = stream;
      setCameraOn(true);
      setTryOnImage(null);

      if (tryOnVideoRef.current) {
        tryOnVideoRef.current.srcObject = stream;
        await tryOnVideoRef.current.play();
      }

      setNotice('Live camera started.');
    } catch {
      setNotice('Camera access denied/unavailable.');
    }
  };

  const stopLiveCamera = () => {
    tryOnStreamRef.current?.getTracks().forEach((t) => t.stop());
    tryOnStreamRef.current = null;
    setCameraOn(false);
    setNotice('Live camera stopped.');
  };

  const captureFromCamera = async (): Promise<string | null> => {
    const v = tryOnVideoRef.current;
    if (!v || !cameraOn) {
      setNotice('Camera is not active.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(v, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const captured = canvas.toDataURL('image/png');
    setTryOnImage(captured);
    setCameraOn(false);
    stopLiveCamera();
    await autoAnchorTryOn(captured);
    setNotice('Captured frame for try-on.');
    return captured;
  };

  const closeTryOn = () => {
    stopLiveCamera();
    setTryOnSession(null);
    setGeneratedTryOn(null);
  };

  const generateTryOn = async () => {
    if (!tryOnProduct) {
      setNotice('Select a product first.');
      return;
    }

    let baseSource = tryOnImage;
    if (!baseSource && cameraOn && tryOnVideoRef.current) {
      baseSource = await captureFromCamera();
    }

    if (!baseSource) {
      setNotice('Upload image or start camera first.');
      return;
    }

    try {
      setIsGeneratingTryOn(true);
      setNotice('Generating try-on result...');

      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: baseSource,
          garmentImage: tryOnProduct.image,
        }),
      });

      const data = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !data.image) {
        setNotice(data.error ?? 'Try-on generation failed');
        return;
      }

      setGeneratedTryOn(data.image);
      setNotice('Try-on generated successfully.');
    } catch {
      setNotice('Failed to generate try-on.');
    } finally {
      setIsGeneratingTryOn(false);
    }
  };

  const saveTryOnResult = async () => {
    if (!tryOnProduct) {
      setNotice('Select a product first.');
      return;
    }

    let baseSource = generatedTryOn || tryOnImage;
    if (!baseSource && cameraOn && tryOnVideoRef.current) {
      baseSource = await captureFromCamera();
    }

    if (!baseSource) {
      setNotice('Upload image or start camera first.');
      return;
    }

    const base = new window.Image();
    base.crossOrigin = 'anonymous';
    base.src = baseSource;
    await new Promise((resolve, reject) => {
      base.onload = resolve;
      base.onerror = reject;
    });

    const overlay = new window.Image();
    overlay.crossOrigin = 'anonymous';
    overlay.src = tryOnProduct.image;
    await new Promise((resolve, reject) => {
      overlay.onload = resolve;
      overlay.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(base, 0, 0);

    const ow = base.width * 0.34 * overlayScale;
    const oh = (overlay.height / overlay.width) * ow;
    const cx = base.width * 0.5 + (overlayX / 100) * (base.width * 0.45);
    const cy = base.height * 0.38 + (overlayY / 100) * (base.height * 0.45);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((overlayRotation * Math.PI) / 180);
    ctx.drawImage(overlay, -ow / 2, -oh / 2, ow, oh);
    ctx.restore();

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'try-on-result.png';
    a.click();
    setNotice('Try-on image saved.');
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
                onClick={() => openTryOn(label)}
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
              <button onClick={() => openTryOn(`Try ${activeProduct.name}`, activeProduct)} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}>Virtual Try-On</button>
              <button onClick={() => setActiveProduct(null)} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25' : 'border-black/20'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {tryOnSession && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4" onClick={closeTryOn}>
          <div className={`w-full max-w-3xl rounded-3xl border p-5 ${theme === 'dark' ? 'border-white/15 bg-[#0b0f17]' : 'border-black/10 bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <p className={`text-xs tracking-[0.2em] ${t.soft}`}>LIVE TRY-ON SESSION</p>
            <h3 className="mt-2 text-2xl font-semibold">{tryOnSession}</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className={`relative h-72 overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-cyan-300/25 bg-[#070b12]' : 'border-black/10 bg-white/90'}`}>
                  {generatedTryOn ? (
                    <Image src={generatedTryOn} alt="Generated try-on" fill unoptimized className="object-cover" />
                  ) : cameraOn ? (
                    <>
                      <video ref={tryOnVideoRef} className="h-full w-full object-cover [transform:scaleX(-1)]" playsInline muted autoPlay />
                      {tryOnProduct && (
                        <div
                          className="pointer-events-none absolute left-1/2 top-[38%]"
                          style={{
                            transform: `translate(-50%, -50%) translate(${overlayX}%, ${overlayY}%) rotate(${overlayRotation}deg) scale(${overlayScale})`,
                            width: '38%',
                          }}
                        >
                          <Image src={tryOnProduct.image} alt={tryOnProduct.name} width={320} height={220} className="h-auto w-full rounded-xl opacity-90 shadow-2xl" />
                        </div>
                      )}
                    </>
                  ) : tryOnImage ? (
                    <>
                      <Image src={tryOnImage} alt="Uploaded try-on" fill unoptimized className="object-cover" />
                      {tryOnProduct && (
                        <div
                          className="pointer-events-none absolute left-1/2 top-[38%]"
                          style={{
                            transform: `translate(-50%, -50%) translate(${overlayX}%, ${overlayY}%) rotate(${overlayRotation}deg) scale(${overlayScale})`,
                            width: '38%',
                          }}
                        >
                          <Image src={tryOnProduct.image} alt={tryOnProduct.name} width={320} height={220} className="h-auto w-full rounded-xl opacity-90 shadow-2xl" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center">
                      <p className={`text-sm ${t.soft}`}>Upload a selfie/photo or start live camera</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/15 bg-white/5' : 'border-black/10 bg-white/80'}`}>
                <label className="mb-3 block text-xs font-semibold tracking-[0.12em]">UPLOAD IMAGE</label>
                <input
                  ref={tryOnInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => onUploadTryOnImage(e.target.files?.[0])}
                  className="hidden"
                />
                <button onClick={openTryOnPicker} className="mb-2 w-full rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-white">
                  Upload / Take Photo
                </button>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button onClick={startLiveCamera} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">Start Live</button>
                  <button onClick={cameraOn ? captureFromCamera : stopLiveCamera} className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white">
                    {cameraOn ? 'Capture' : 'Stop Live'}
                  </button>
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onUploadTryOnImage(e.dataTransfer.files?.[0]);
                  }}
                  className={`mb-4 rounded-xl border border-dashed p-3 text-xs ${theme === 'dark' ? 'border-white/25 text-white/70' : 'border-black/20 text-black/60'}`}
                >
                  Drag & drop image here (optional)
                </div>

                <label className="mb-1 block text-xs font-semibold tracking-[0.12em]">PRODUCT</label>
                <select
                  value={tryOnProduct?.name ?? products[0].name}
                  onChange={(e) => {
                    const next = products.find((p) => p.name === e.target.value) ?? products[0];
                    setTryOnProduct(next);
                    if (tryOnImage) void autoAnchorTryOn(tryOnImage, next);
                  }}
                  className={`mb-4 w-full rounded-xl border px-3 py-2 text-sm ${theme === 'dark' ? 'border-white/20 bg-black/30' : 'border-black/15 bg-white'}`}
                >
                  {products.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>

                <label className="text-xs">X Position</label>
                <input type="range" min={-60} max={60} value={overlayX} onChange={(e) => setOverlayX(Number(e.target.value))} className="mb-2 w-full" />
                <label className="text-xs">Y Position</label>
                <input type="range" min={-60} max={60} value={overlayY} onChange={(e) => setOverlayY(Number(e.target.value))} className="mb-2 w-full" />
                <label className="text-xs">Scale</label>
                <input type="range" min={0.4} max={2.2} step={0.01} value={overlayScale} onChange={(e) => setOverlayScale(Number(e.target.value))} className="mb-2 w-full" />
                <label className="text-xs">Rotation</label>
                <input type="range" min={-40} max={40} value={overlayRotation} onChange={(e) => setOverlayRotation(Number(e.target.value))} className="mb-4 w-full" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={generateTryOn} disabled={isGeneratingTryOn} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {isGeneratingTryOn ? 'Generating…' : 'Generate Try-On'}
              </button>
              <button onClick={saveTryOnResult} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white">Save Result</button>
              <button onClick={() => setNotice('Size recommendation generated')} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25 bg-white/5' : 'border-black/20'}`}>Suggest Size</button>
              <button onClick={closeTryOn} className={`rounded-full border px-4 py-2 text-sm ${theme === 'dark' ? 'border-white/25 bg-white/5' : 'border-black/20'}`}>End Session</button>
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
