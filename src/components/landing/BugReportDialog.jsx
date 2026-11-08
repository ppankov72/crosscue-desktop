// Phase G.1 — Bug report dialog form.
import { useState } from 'react';
import { Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { communityTranslations } from '@/lib/landing/communityTranslations';
import { base44 } from '@/api/base44Client';

export default function BugReportDialog({ open, onClose }) {
  const { lang } = useI18n();
  const t = (communityTranslations[lang] || communityTranslations.en).bug;
  const [form, setForm] = useState({ title: '', description: '', category: 'other', severity: 'medium', reproduction_steps: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    if (form.title.trim().length < 3) { setError(t.errorTitle); return; }
    if (form.description.trim().length < 10) { setError(t.errorDesc); return; }

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('submitBugReport', {
        title: form.title,
        description: form.description,
        category: form.category,
        severity: form.severity,
        reproduction_steps: form.reproduction_steps,
        route: window.location.pathname
      });
      if (res.data?.ok) {
        setResult({ id: res.data.report_id });
        setForm({ title: '', description: '', category: 'other', severity: 'medium', reproduction_steps: '' });
      } else {
        setError(res.data?.error === 'Unauthorized' ? t.loginRequired : res.data?.error || 'error');
      }
    } catch (e) {
      setError(e.response?.data?.error === 'Unauthorized' ? t.loginRequired : 'error');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{t.dialogTitle}</h3>
          <button onClick={handleClose} className="rounded-lg p-1 hover:bg-stone-100"><X size={18} /></button>
        </div>

        {result ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle size={48} className="text-green-500" />
            <p className="text-lg font-bold text-stone-900">{t.success}</p>
            <p className="text-sm text-stone-500">{t.successId}: <span className="font-mono font-bold">{result.id}</span></p>
            <button onClick={handleClose} className="mt-2 rounded-lg bg-stone-900 px-5 py-2 text-sm font-bold text-white hover:bg-stone-800">OK</button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-stone-700">{t.titleLabel}</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder={t.titlePlaceholder}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-stone-700">{t.descriptionLabel}</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={t.descriptionPlaceholder}
                maxLength={3000}
                rows={4}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-stone-700">{t.categoryLabel}</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  {Object.entries(t.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-stone-700">{t.severityLabel}</label>
                <select
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                >
                  {Object.entries(t.severities).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-stone-700">{t.reproductionLabel}</label>
              <textarea
                value={form.reproduction_steps}
                onChange={e => setForm({ ...form, reproduction_steps: e.target.value })}
                placeholder={t.reproductionPlaceholder}
                maxLength={2000}
                rows={3}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleClose} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.cancel}</button>
              <button onClick={handleSubmit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null} {t.submit}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}