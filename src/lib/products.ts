export type StoreProduct = {
  slug: string;
  name: string;
  category: string;
  price: string;
  oldPrice: string;
  tag: string;
  hue: string;
  image: string;
  description: string;
  variants: string[];
  sizes: string[];
};

export const products: StoreProduct[] = [
  {
    slug: 'aether-runner',
    name: 'Aether Runner',
    price: '$149',
    oldPrice: '$189',
    tag: 'New',
    hue: 'from-cyan-400 to-blue-600',
    category: 'Sneakers',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    description: 'Lightweight performance sneaker with all-day comfort and breathable mesh body.',
    variants: ['Arctic White', 'Midnight Black', 'Neon Pulse'],
    sizes: ['39', '40', '41', '42', '43', '44'],
  },
  {
    slug: 'nova-jacket',
    name: 'Nova Jacket',
    price: '$219',
    oldPrice: '$269',
    tag: 'Best Seller',
    hue: 'from-fuchsia-400 to-violet-600',
    category: 'Outerwear',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    description: 'Premium insulated jacket with weather-resistant shell and tailored urban fit.',
    variants: ['Graphite', 'Sandstone', 'Forest Green'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'flux-headset',
    name: 'Flux Headset',
    price: '$179',
    oldPrice: '$229',
    tag: 'Limited',
    hue: 'from-amber-400 to-orange-600',
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    description: 'Noise-cancelling wireless headset with deep bass tuning and low-latency mode.',
    variants: ['Matte Black', 'Stone Gray'],
    sizes: ['One Size'],
  },
  {
    slug: 'orbit-glasses',
    name: 'Orbit Glasses',
    price: '$129',
    oldPrice: '$159',
    tag: 'Trending',
    hue: 'from-emerald-400 to-teal-600',
    category: 'Wearables',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80',
    description: 'Ultra-light frame glasses with anti-reflective coating and premium hinge design.',
    variants: ['Clear Crystal', 'Tortoise', 'Jet Black'],
    sizes: ['Narrow', 'Standard', 'Wide'],
  },
  {
    slug: 'pulse-hoodie',
    name: 'Pulse Hoodie',
    price: '$99',
    oldPrice: '$129',
    tag: 'Sale',
    hue: 'from-rose-400 to-pink-600',
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
    description: 'Heavyweight cotton hoodie with relaxed fit and brushed interior finish.',
    variants: ['Smoke', 'Ash', 'Charcoal'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'neo-watch',
    name: 'Neo Watch',
    price: '$249',
    oldPrice: '$299',
    tag: 'Premium',
    hue: 'from-indigo-400 to-blue-700',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    description: 'Smart hybrid watch with adaptive display, fitness tracking, and 7-day battery.',
    variants: ['Steel', 'Onyx', 'Rose Gold'],
    sizes: ['40mm', '44mm'],
  },
];
