import { Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'fr', label: 'French' },
];

type LanguageToggleProps = {
  variant?: 'header' | 'floating';
};

export default function LanguageToggle({ variant = 'header' }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const activeLanguage = i18n.language.split('-')[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    window.localStorage.setItem('coffee-scm-language', code);
    setOpen(false);
  };

  const floating = variant === 'floating';

  return (
    <div className={floating ? 'fixed right-4 top-4 z-50' : 'relative'}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 ${
          floating ? 'shadow-xl' : ''
        }`}
        aria-label={t('language')}
      >
        <Globe className="h-4 w-4 text-emerald-700" />
        <span className="uppercase">{activeLanguage}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-40 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => changeLanguage(language.code)}
              className={`w-full px-4 py-2 text-left text-sm ${
                activeLanguage === language.code
                  ? 'bg-emerald-50 font-semibold text-emerald-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {language.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

