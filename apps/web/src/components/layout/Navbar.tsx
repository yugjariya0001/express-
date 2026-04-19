'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Train, ShoppingCart, Menu, X, User, LogOut, LayoutDashboard, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    setMenuOpen(false);
  };

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-primary-500 font-bold text-xl">
            <Train className="w-7 h-7" />
            <span>Express Tadka</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium transition-colors">
              🚂 Search Train
            </Link>
            {user && (
              <Link href="/orders" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium transition-colors">
                My Orders
              </Link>
            )}
            {user?.role === 'restaurant' && (
              <Link href="/restaurant" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium transition-colors">
                Dashboard
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link href="/admin" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium transition-colors">
                Admin
              </Link>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Cart */}
            <Link href="/checkout" className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">{user.name || user.mobile}</span>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/auth" className="hidden md:block btn-primary text-sm py-2 px-4">
                Login
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 space-y-3">
          <Link href="/search" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-500">
            <Train className="w-4 h-4" /> Search Train
          </Link>
          {user ? (
            <>
              <Link href="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-500">
                <User className="w-4 h-4" /> My Orders
              </Link>
              {user.role === 'restaurant' && (
                <Link href="/restaurant" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-500">
                  <Store className="w-4 h-4" /> Restaurant
                </Link>
              )}
              {user.role === 'admin' && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-500">
                  <LayoutDashboard className="w-4 h-4" /> Admin
                </Link>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-600">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <Link href="/auth" onClick={() => setMenuOpen(false)} className="btn-primary block text-center">
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
