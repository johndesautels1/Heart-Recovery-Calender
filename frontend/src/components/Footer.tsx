import React from 'react';
import { Heart } from 'lucide-react';
import logoImage from '../data/AI_Division_logo_TRANSPARENT.png';

export function Footer() {
  return (
    <footer
      className="mt-auto border-t"
      style={{
        borderColor: 'var(--card-light)',
        background: 'linear-gradient(to bottom, var(--card), var(--bg))'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Main Footer Content */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Heart className="h-6 w-6 text-red-500" fill="currentColor" />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Cardiac Recovery Pro™
            </h3>
          </div>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--cyan)' }}>
            Complete Recovery Tracking & Analytics System
          </p>
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: 'var(--purple)' }}>
              Powered by our exclusive <span className="font-bold" style={{ color: 'var(--purple)' }}>PULSE Technology™</span>
            </p>
            <p className="text-xs italic" style={{ color: 'var(--purple)' }}>
              Personal Universal Life Support Engine
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
          <a
            href="https://heartbeat-claude-code.vercel.app/disclosures.html#privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors font-medium hover:opacity-80"
            style={{ color: 'var(--cyan)' }}
          >
            Privacy Policy
          </a>
          <span style={{ color: 'var(--muted)' }}>|</span>
          <a
            href="https://heartbeat-claude-code.vercel.app/disclosures.html#terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors font-medium hover:opacity-80"
            style={{ color: 'var(--cyan)' }}
          >
            Terms of Service
          </a>
          <span style={{ color: 'var(--muted)' }}>|</span>
          <a
            href="https://heartbeat-claude-code.vercel.app/disclosures.html#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors font-medium hover:opacity-80"
            style={{ color: 'var(--cyan)' }}
          >
            Contact Support
          </a>
        </div>

        {/* Company Logo */}
        <div className="absolute left-8 bottom-[264px] group">
          <div className="relative">
            <img
              src={logoImage}
              alt="AI Applications Division - John E. Desautels & Associates"
              className="w-32 h-auto opacity-90 hover:opacity-100 transition-opacity cursor-help"
            />
            {/* Company Info Tooltip */}
            <div className="absolute left-0 bottom-full mb-2 w-72 p-4 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50"
              style={{
                backgroundColor: 'rgba(20, 20, 30, 0.98)',
                borderColor: 'var(--accent)',
                border: '2px solid'
              }}
            >
              <div className="space-y-2 text-sm">
                <h4 className="font-bold text-base" style={{ color: 'var(--accent)' }}>
                  John E. Desautels & Associates
                </h4>
                <div style={{ color: 'var(--ink)' }}>
                  <p className="font-semibold" style={{ color: 'var(--cyan)' }}>AI Applications Division</p>
                  <p className="mt-2">290 41st Ave.</p>
                  <p>St. Pete Beach, FL 33706</p>
                  <p className="mt-2">
                    <a href="tel:+17274523506" className="hover:underline" style={{ color: 'var(--accent)' }}>
                      +1-727-452-3506
                    </a>
                  </p>
                  <p>
                    <a href="https://hearthealthrecovery.com" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>
                      hearthealthrecovery.com
                    </a>
                  </p>
                  <p>
                    <a href="mailto:hearthealthrecovery@gmail.com" className="hover:underline" style={{ color: 'var(--accent)' }}>
                      hearthealthrecovery@gmail.com
                    </a>
                  </p>
                  <p className="mt-3 pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <span className="font-semibold">President & Managing Member:</span><br/>
                    John E. Desautels
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div
          className="mb-6 p-4 border rounded-lg"
          style={{
            backgroundColor: 'rgba(127, 29, 29, 0.2)',
            borderColor: 'var(--bad)'
          }}
        >
          <div className="flex items-start gap-2">
            <span className="font-bold text-lg mt-0.5" style={{ color: 'var(--bad)' }}>⚕️</span>
            <div>
              <h4 className="font-bold mb-2" style={{ color: 'var(--bad)' }}>Medical Disclaimer</h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }}>
                This application is for informational and fitness tracking purposes only. It is not intended to diagnose,
                treat, cure, or prevent any disease. Always consult with a qualified healthcare professional regarding any
                medical condition or treatment. In case of a medical emergency, call 911 immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright & Legal */}
        <div className="text-center space-y-2 text-xs" style={{ color: 'var(--muted)' }}>
          <p>
            © 2025 <span className="font-semibold" style={{ color: 'var(--ink)' }}>Heartbeat Health Technologies</span>. All rights reserved.
          </p>
          <p>
            <span className="font-medium" style={{ color: 'var(--purple)' }}>Cardiac Recovery Pro™</span>,
            <span className="font-medium" style={{ color: 'var(--purple)' }}> PULSE Technology™</span>, and associated logos are trademarks of
            <span className="font-semibold" style={{ color: 'var(--ink)' }}> Heartbeat Health Technologies</span>.
          </p>
          <p className="font-medium" style={{ color: 'var(--warn)' }}>
            Patents pending. Unauthorized reproduction or distribution is prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
