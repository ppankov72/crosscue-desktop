import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/landing/i18n';
import { useConsent } from '@/lib/landing/consentContext';
import { legalTranslations } from '@/lib/landing/legalTranslations';

export default function SiteFooter() {
  const { t, lang } = useI18n();
  const { openSettings } = useConsent();
  const lt = (legalTranslations[lang] || legalTranslations.en).footer;

  return (
    <footer className="bg-stone-900 py-16 text-stone-400">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl tracking-wider text-amber-400">CROSSCUE</h3>
            <p className="mt-2 text-sm">{t.footer.tagline}</p>
            <p className="mt-4 text-xs text-stone-500">{t.footer.subtitle}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-stone-300">{t.footer.sections[0].title}</h4>
            <ul className="mt-4 space-y-2">
              {t.footer.sections[0].links.map((label, li) => (
                <li key={li}><a href="#" className="text-sm hover:text-amber-400">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-stone-300">{t.footer.sections[1].title}</h4>
            <ul className="mt-4 space-y-2">
              {t.footer.sections[1].links.map((label, li) => (
                <li key={li}><a href="#docs" className="text-sm hover:text-amber-400">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-stone-300">{t.footer.sections[2].title}</h4>
            <ul className="mt-4 space-y-2">
              {t.footer.sections[2].links.map((label, li) => (
                <li key={li}><a href="#community" className="text-sm hover:text-amber-400">{label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal links — always accessible without authentication */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-800 pt-6 text-xs">
          <Link to="/impressum" className="cursor-pointer hover:text-amber-400">{lt.impressum}</Link>
          <Link to="/privacy" className="cursor-pointer hover:text-amber-400">{lt.privacy}</Link>
          <button onClick={openSettings} className="cursor-pointer hover:text-amber-400">{lt.cookieSettings}</button>
          <Link to="/terms" className="cursor-pointer hover:text-amber-400">{lt.terms}</Link>
          <Link to="/contact" className="cursor-pointer hover:text-amber-400">{lt.contact}</Link>
          <span className="ml-auto">© {new Date().getFullYear()} CROSSCUE. {t.footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}