// Phase G.2 — Real documentation browser with functional search.
// Searches titles, section titles, and body text across the current language.
// Supports context-sensitive routing via URL hash (#docs-<category-id>).
import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Library, Disc3, SlidersHorizontal, Radio, WifiOff, HelpCircle, Users, UserCircle, BarChart3, Search, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { docsTranslations } from '@/lib/landing/docsTranslations';
import { base44 } from '@/api/base44Client';

const iconMap = { BookOpen, Library, Disc3, SlidersHorizontal, Radio, WifiOff, HelpCircle, Users, UserCircle, BarChart3 };

export default function Docs() {
  const { lang } = useI18n();
  const staticT = docsTranslations[lang] || docsTranslations.en;
  const [managedCategories, setManagedCategories] = useState(null);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(staticT.categories[0]?.id || '');

  // P2 — Fetch managed content from entities; fall back to static translations.
  useEffect(() => {
    base44.functions.invoke('getPublishedContent', { language: lang })
      .then(res => {
        const data = res.data;
        if (data.categories && data.categories.length > 0) {
          const categories = [...data.categories];
          if (data.faq && data.faq.length > 0) {
            const staticFaqCat = staticT.categories.find(c => c.id === 'faq');
            categories.push({
              id: 'faq',
              title: staticFaqCat?.title || 'FAQ',
              icon: 'HelpCircle',
              sections: data.faq.map(f => ({ title: f.question, body: f.answer }))
            });
          }
          setManagedCategories(categories);
        } else {
          setManagedCategories(null);
        }
      })
      .catch(() => setManagedCategories(null));
  }, [lang]);

  const t = { ...staticT, categories: managedCategories || staticT.categories };

  // Sync active category with URL hash for context-sensitive linking
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#docs-')) {
      const id = hash.slice(6);
      if (t.categories.some(c => c.id === id)) setActiveId(id);
    }
  }, [t]);

  // Flatten all searchable content for the current language
  const searchIndex = useMemo(() => {
    const entries = [];
    for (const cat of t.categories) {
      for (const sec of cat.sections) {
        entries.push({
          categoryId: cat.id,
          categoryTitle: cat.title,
          sectionTitle: sec.title,
          body: sec.body,
          text: `${cat.title} ${sec.title} ${sec.body}`.toLowerCase(),
        });
      }
    }
    return entries;
  }, [t]);

  // Search results — matches in section titles or body text
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return searchIndex.filter(e => e.text.includes(q)).slice(0, 20);
  }, [query, searchIndex]);

  const activeCategory = t.categories.find(c => c.id === activeId) || t.categories[0];

  const selectCategory = (id) => {
    setActiveId(id);
    setQuery('');
    window.history.replaceState(null, '', `#docs-${id}`);
  };

  return (
    <section id="docs" className="bg-stone-50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.subtitle}</p>

        {/* Search bar */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Search results or category browser */}
        {searchResults ? (
          <div className="mt-8">
            <p className="mb-4 text-sm text-stone-500">{searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}</p>
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectCategory(r.categoryId)}
                    className="block w-full rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-amber-400 hover:shadow-md"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{r.categoryTitle}</p>
                    <p className="mt-1 text-base font-bold text-stone-900">{r.sectionTitle}</p>
                    <p className="mt-1 text-sm text-stone-600 line-clamp-2">{r.body}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-stone-400">{t.noResults}</p>
            )}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Category sidebar */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                {t.categories.map(cat => {
                  const Icon = iconMap[cat.icon] || BookOpen;
                  const active = cat.id === activeId;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => selectCategory(cat.id)}
                      className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:w-full ${
                        active ? 'bg-amber-100 text-amber-800' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="whitespace-nowrap lg:whitespace-normal">{cat.title}</span>
                      {active && <ChevronRight size={14} className="hidden lg:ml-auto lg:block" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content area */}
            <div className="min-w-0">
              {activeCategory && (
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">{activeCategory.title}</h3>
                  <div className="mt-6 space-y-6">
                    {activeCategory.sections.map((sec, i) => (
                      <div key={i} className="rounded-xl border border-stone-200 bg-white p-5">
                        <h4 className="text-lg font-bold text-stone-900">{sec.title}</h4>
                        <div className="mt-2 text-sm leading-relaxed text-stone-600 docs-body" dangerouslySetInnerHTML={{ __html: sec.body }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}