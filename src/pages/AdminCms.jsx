import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, RefreshCw, FileText, Navigation, Layout, Image, Palette, Upload, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildDefaultCmsContent } from '@/lib/cms/cmsDefaults';
import CmsPageEditor from '@/components/cms/CmsPageEditor';
import CmsSettingsEditor from '@/components/cms/CmsSettingsEditor';
import CmsMediaLibrary from '@/components/cms/CmsMediaLibrary';

const TABS = [
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'navigation', label: 'Navigation', icon: Navigation },
  { id: 'footer', label: 'Footer', icon: Layout },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'theme', label: 'Global Styles', icon: Palette },
];

export default function AdminCms() {
  const [tab, setTab] = useState('pages');
  const [migrated, setMigrated] = useState(null); // null = unknown, true = done, false = needed
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState(null);

  // Check if CMS has been migrated
  const checkMigration = () => {
    base44.functions.invoke('adminCmsPage', { action: 'list' })
      .then(res => {
        setMigrated(res.data?.pages?.length > 0);
      })
      .catch(() => setMigrated(false));
  };

  useEffect(() => { checkMigration(); }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateError(null);
    try {
      const defaults = buildDefaultCmsContent();
      const res = await base44.functions.invoke('adminCmsMigrate', { defaults });
      if (res.data?.ok) {
        setMigrated(true);
        checkMigration();
      } else {
        setMigrateError(res.data?.error || 'Migration failed');
      }
    } catch (err) {
      setMigrateError(err.message || 'Migration failed');
    }
    setMigrating(false);
  };

  if (migrated === null) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CMS</span>
            <nav className="ml-6 flex items-center gap-4 border-l border-stone-200 pl-6">
              <Link to="/admin" className="text-sm font-medium text-stone-500 hover:text-amber-700">Overview</Link>
              <Link to="/admin/content" className="text-sm font-medium text-stone-500 hover:text-amber-700">Content</Link>
              <Link to="/admin/landing" className="text-sm font-medium text-stone-500 hover:text-amber-700">Landing</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={checkMigration} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
              <ArrowLeft size={14} /> Control Room
            </Link>
          </div>
        </div>
      </header>

      {!migrated ? (
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-8 text-center">
            <AlertCircle size={40} className="mx-auto text-amber-600" />
            <h2 className="mt-4 text-xl font-bold text-stone-900">CMS Migration Required</h2>
            <p className="mt-2 text-sm text-stone-600">
              Migrate the current public website content into the CMS. This creates CMS records from the existing translations.
              The live site will continue to work — CMS content is published immediately after migration.
            </p>
            {migrateError && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{migrateError}</p>}
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Upload size={16} /> {migrating ? 'Migrating...' : 'Migrate Content to CMS'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tab navigation */}
          <div className="sticky top-[57px] z-40 border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-7xl gap-1 px-6">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-bold ${tab === t.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-6 py-6">
            {tab === 'pages' && <CmsPageEditor />}
            {tab === 'navigation' && <CmsSettingsEditor settingKey="navigation" title="Navigation" />}
            {tab === 'footer' && <CmsSettingsEditor settingKey="footer" title="Footer" />}
            {tab === 'theme' && <CmsSettingsEditor settingKey="theme" title="Global Styles" />}
            {tab === 'media' && <CmsMediaLibrary />}
          </div>
        </>
      )}
    </div>
  );
}