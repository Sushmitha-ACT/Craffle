/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, MapPin, Mail, Phone, Instagram, Twitter, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
      <div className="w-full px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#ff8b3d] flex items-center justify-center shadow-md">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                Cra<span style={{ color: 'var(--primary)' }}>ffle</span>
              </span>
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Connecting home-based creators with nearby customers through GPS-powered discovery. Fresh, authentic, and local.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="#" className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--muted)' }}>
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--muted)' }}>
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--muted)' }}>
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[15px] font-extrabold uppercase tracking-wider mb-4" style={{ color: 'var(--text)' }}>Explore</h4>
            <ul className="space-y-3">
              {[
                { label: 'Discover Products', page: 'discover' },
                { label: 'Categories', page: 'categories' },
                { label: 'Nearby Sellers', page: 'discover' },
                { label: 'How It Works', page: 'home' },
              ].map(link => (
                <li key={link.page + link.label}>
                  <button onClick={() => onNavigate(link.page)}
                    className="text-[15px] transition-colors hover:text-[var(--primary)] cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sellers */}
          <div>
            <h4 className="text-[15px] font-extrabold uppercase tracking-wider mb-4" style={{ color: 'var(--text)' }}>For Sellers</h4>
            <ul className="space-y-3">
              {['Become a Seller', 'Seller Dashboard', 'Pricing & Commissions', 'Seller Guidelines'].map(label => (
                <li key={label}>
                  <button className="text-[15px] transition-colors hover:text-[var(--primary)] cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[15px] font-extrabold uppercase tracking-wider mb-4" style={{ color: 'var(--text)' }}>Contact</h4>
            <ul className="space-y-3.5">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <span className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>Chennai, Tamil Nadu, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <span className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>craffle.support@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <span className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>+91 98765 43210</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            © {new Date().getFullYear()} Craffle. All rights reserved.
          </p>
          <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            Made with <Heart className="w-3.5 h-3.5 text-[var(--danger)] fill-[var(--danger)]" /> in Chennai
          </p>
        </div>
      </div>
    </footer>
  );
}
