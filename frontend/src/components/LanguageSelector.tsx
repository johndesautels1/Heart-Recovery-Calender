import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <div className="relative inline-block">
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 pr-8 rounded-lg border text-sm appearance-none cursor-pointer"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: 'var(--ink)',
        }}
      >
        {languages.map((lang) => (
          <option
            key={lang.code}
            value={lang.code}
            style={{ backgroundColor: '#1a1a1a', color: '#e0e0e0' }}
          >
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <Languages
        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none"
        style={{ color: 'var(--muted)' }}
      />
    </div>
  );
}
