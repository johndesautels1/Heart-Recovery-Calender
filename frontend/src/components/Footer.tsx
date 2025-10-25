import React from 'react';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Heart className="h-6 w-6 text-red-500" fill="currentColor" />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Cardiac Recovery Pro™
            </h3>
          </div>
          <p className="text-lg font-semibold text-cyan-400 mb-2">
            Complete Recovery Tracking & Analytics System
          </p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-purple-400">
              Powered by our exclusive <span className="font-bold text-purple-300">PULSE Technology™</span>
            </p>
            <p className="text-xs italic text-purple-300">
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
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Privacy Policy
          </a>
          <span className="text-gray-600">|</span>
          <a
            href="https://heartbeat-claude-code.vercel.app/disclosures.html#terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Terms of Service
          </a>
          <span className="text-gray-600">|</span>
          <a
            href="https://heartbeat-claude-code.vercel.app/disclosures.html#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Contact Support
          </a>
        </div>

        {/* Medical Disclaimer */}
        <div className="mb-6 p-4 bg-red-950 bg-opacity-30 border border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold text-lg mt-0.5">⚕️</span>
            <div>
              <h4 className="font-bold text-red-400 mb-2">Medical Disclaimer</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                This application is for informational and fitness tracking purposes only. It is not intended to diagnose,
                treat, cure, or prevent any disease. Always consult with a qualified healthcare professional regarding any
                medical condition or treatment. In case of a medical emergency, call 911 immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright & Legal */}
        <div className="text-center space-y-2 text-xs text-gray-400">
          <p>
            © 2025 <span className="font-semibold text-gray-300">Heartbeat Health Technologies</span>. All rights reserved.
          </p>
          <p>
            <span className="font-medium text-purple-400">Cardiac Recovery Pro™</span>,
            <span className="font-medium text-purple-400"> PULSE Technology™</span>, and associated logos are trademarks of
            <span className="font-semibold text-gray-300"> Heartbeat Health Technologies</span>.
          </p>
          <p className="text-yellow-600 font-medium">
            Patents pending. Unauthorized reproduction or distribution is prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
