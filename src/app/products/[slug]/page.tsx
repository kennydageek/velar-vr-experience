import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Palette, Ruler, Sparkles, ShoppingBag } from 'lucide-react';
import { products } from '@/lib/products';
import { ProductModel3D } from '@/components/ProductModel3D';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return notFound();

  return (
    <main className="min-h-screen bg-[#0b0f17] px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-white/80">
          <ArrowLeft size={14} aria-hidden="true" />
          BACK TO STORE
        </Link>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="relative h-[340px] overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <ProductModel3D category={product.category} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="inline-flex items-center gap-2 text-xs tracking-[0.25em] text-white/60">
              <BadgeCheck size={14} aria-hidden="true" />
              {product.category}
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{product.name}</h1>
            <p className="mt-2 text-sm text-white/70">{product.description}</p>

            <div className="mt-4 flex items-center gap-3">
              <p className="text-3xl font-semibold">{product.price}</p>
              <p className="text-lg text-white/50 line-through">{product.oldPrice}</p>
            </div>

            <div className="mt-6">
              <p className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-white/60"><Palette size={14} aria-hidden="true" /> VARIANTS</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button key={v} className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/90">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-white/60"><Ruler size={14} aria-hidden="true" /> SIZE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button key={s} className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/90">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-white">
                <ShoppingBag size={16} aria-hidden="true" />
                Add to Cart
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm">
                <Sparkles size={16} aria-hidden="true" />
                Virtual Try-On
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
