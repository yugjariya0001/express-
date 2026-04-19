import Link from 'next/link';
import { Train, Star, Clock, Utensils, Shield, Smartphone } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-orange-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="animate-train-move absolute bottom-8 text-6xl">🚂</div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Now serving at 500+ stations across India
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Order Food on Your<br />
            <span className="text-yellow-300">Train Journey</span> 🍛
          </h1>
          <p className="text-lg sm:text-xl text-orange-100 max-w-2xl mx-auto mb-10">
            Fresh, hot meals delivered right to your seat. No more stale pantry food.
            Available across India&apos;s railway network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/search" className="bg-white text-primary-600 font-bold py-4 px-8 rounded-2xl text-lg hover:bg-orange-50 transition-all active:scale-95 shadow-lg">
              🚂 Find Your Train
            </Link>
            <Link href="/auth" className="border-2 border-white text-white font-bold py-4 px-8 rounded-2xl text-lg hover:bg-white/10 transition-all">
              Enter PNR
            </Link>
          </div>
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-12 fill-white dark:fill-gray-950">
            <path d="M0,60 C360,0 1080,60 1440,0 L1440,60 Z" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Express Tadka?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Smartphone className="w-8 h-8 text-primary-500" />,
              title: 'OTP Login',
              desc: 'No passwords needed. Just your mobile number and a quick OTP.',
            },
            {
              icon: <Clock className="w-8 h-8 text-secondary-600" />,
              title: '30-Min Delivery',
              desc: 'Hot food delivered to your seat before your stop arrives.',
            },
            {
              icon: <Shield className="w-8 h-8 text-blue-500" />,
              title: 'Hygiene Certified',
              desc: 'All partner restaurants are FSSAI certified and hygiene checked.',
            },
          ].map((f) => (
            <div key={f.title} className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-2xl mb-4">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '1', emoji: '🚂', title: 'Enter Train/PNR', desc: 'Search your train by number, name, or PNR' },
              { step: '2', emoji: '🍽️', title: 'Choose Restaurant', desc: 'Pick from restaurants at your delivery station' },
              { step: '3', emoji: '🛒', title: 'Place Order', desc: 'Add items to cart and checkout securely' },
              { step: '4', emoji: '🪑', title: 'Get Delivered', desc: 'Fresh food delivered to your seat!' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-3xl mb-4">
                    {s.emoji}
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Cuisines */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Popular Cuisines</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'North Indian', emoji: '🍛' },
            { name: 'South Indian', emoji: '🥘' },
            { name: 'Biryani', emoji: '🍚' },
            { name: 'Snacks', emoji: '🥪' },
            { name: 'Sweets', emoji: '🍬' },
            { name: 'Beverages', emoji: '☕' },
          ].map((c) => (
            <Link
              key={c.name}
              href={`/search?cuisine=${c.name}`}
              className="card p-4 text-center hover:border-primary-500 border-2 border-transparent transition-all"
            >
              <div className="text-4xl mb-2">{c.emoji}</div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Stations' },
              { value: '1000+', label: 'Restaurants' },
              { value: '50K+', label: 'Happy Customers' },
              { value: '30 min', label: 'Avg Delivery' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl sm:text-4xl font-bold text-yellow-300">{s.value}</div>
                <div className="text-orange-100 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
          Your next train journey just got tastier. Order in 2 minutes.
        </p>
        <Link href="/search" className="btn-primary text-lg py-4 px-10 inline-block">
          Order Now 🍱
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-primary-500 font-bold text-xl">
              <Train className="w-6 h-6" />
              Express Tadka
            </div>
            <p className="text-gray-500 text-sm text-center">
              © {new Date().getFullYear()} Express Tadka. Made with ❤️ for Indian railway travellers.
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-primary-500">Privacy</a>
              <a href="#" className="hover:text-primary-500">Terms</a>
              <a href="#" className="hover:text-primary-500">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
