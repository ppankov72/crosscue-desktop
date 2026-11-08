import { useState, useRef, useEffect } from 'react';
import { Download, Printer, ArrowLeft, Sliders, CheckCircle2, Disc, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { uiLanguages } from '@/lib/i18n/flags';
import { detectLang, setStoredLang } from '@/lib/i18n/sharedLang';
import { midiGuideTranslations } from '@/lib/i18n/midiGuideTranslations';

export default function MidiGuide() {
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState(() => detectLang('bg'));
  const contentRef = useRef(null);

  useEffect(() => {
    setStoredLang(lang);
  }, [lang]);

  const t = midiGuideTranslations[lang] || midiGuideTranslations.en;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      // Dynamic import of html2canvas and jspdf (already installed in package.json)
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const jspdfModule = await import('jspdf');
      const { jsPDF } = jspdfModule;

      const element = contentRef.current;
      if (!element) {
        window.print();
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save('CrossCue_MIDI_Mapping_Instruktsiya.pdf');
    } catch (err) {
      console.error('PDF generation error, fallback to browser print:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1013] text-[#e5e7eb] font-sans">
      {/* Top action bar - hidden on print */}
      <header className="no-print sticky top-0 z-40 border-b border-[#2d333b] bg-[#161b22]/95 backdrop-blur px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/studio"
              className="inline-flex items-center gap-1.5 rounded border border-[#3d444d] bg-[#21262d] px-3 py-1.5 text-xs font-bold text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
            >
              <ArrowLeft size={14} /> {t.backToStudio}
            </Link>
            <div className="hidden sm:block">
              <span className="font-bold text-amber-400">CROSSCUE</span>
              <span className="mx-2 text-stone-500">|</span>
              <span className="text-xs text-stone-300">{t.brandSubtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language dropdown */}
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="rounded border border-[#3d444d] bg-[#21262d] px-2.5 py-1.5 text-xs font-bold text-[#f0f6fc] outline-none hover:bg-[#30363d] cursor-pointer"
            >
              {uiLanguages.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded border border-[#3d444d] bg-[#21262d] px-3 py-1.5 text-xs font-bold text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
              title="Print / Save as PDF"
            >
              <Printer size={14} /> {t.printBtn}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded border border-amber-500/50 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black px-4 py-1.5 text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? t.generating : t.downloadBtn}
            </button>
          </div>
        </div>
      </header>

      {/* Main printable content container */}
      <main className="p-4 sm:p-8 flex justify-center">
        <div
          ref={contentRef}
          id="midi-guide-printable"
          className="w-full max-w-4xl bg-white text-stone-900 rounded-lg shadow-2xl p-6 sm:p-12 print:p-0 print:shadow-none print:rounded-none print:max-w-none print:text-black"
          style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
        >
          {/* Header section */}
          <div className="border-b-2 border-stone-800 pb-6 mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-black tracking-wider text-sm uppercase">
                <Sliders size={18} />
                <span>{t.headerCategory}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
                {t.title}
              </h1>
              <p className="text-stone-600 text-sm mt-1">
                {t.subtitle}
              </p>
            </div>
            <div className="text-right text-xs text-stone-500 print:text-stone-700">
              <span className="inline-block bg-stone-100 border border-stone-300 rounded px-2.5 py-1 font-mono font-bold text-stone-800">
                {t.versionBadge} ({lang.toUpperCase()})
              </span>
              <p className="mt-1">{t.controllerNotice}</p>
            </div>
          </div>

          {/* Quick summary box */}
          <div className="bg-amber-50/80 border-l-4 border-amber-500 p-4 rounded-r mb-8">
            <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-600" />
              {t.beforeStartTitle}
            </h3>
            <p className="text-stone-700 text-xs sm:text-sm mt-1 leading-relaxed">
              {t.beforeStartDesc}
            </p>
          </div>

          {/* Step 1: Navigating to Create/Edit */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-black">1</span>
              {t.step1Title}
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-stone-700 mt-3 leading-relaxed">
              {t.step1Items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </section>

          {/* Step 2: The Core Rule: ADD ENTRY -> LEARN -> ASSIGN */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-black">2</span>
              {t.step2Title}
            </h2>
            <div className="bg-stone-50 border border-stone-200 rounded p-4 mt-3">
              <p className="text-sm font-semibold text-stone-800 mb-2">
                {t.step2Desc}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded border border-stone-300">
                  <span className="font-bold text-stone-900 block mb-1">{t.step2A}</span>
                  {t.step2ADesc}
                </div>
                <div className="bg-white p-3 rounded border border-amber-300">
                  <span className="font-bold text-amber-800 block mb-1">{t.step2B}</span>
                  {t.step2BDesc}
                </div>
                <div className="bg-white p-3 rounded border border-green-300">
                  <span className="font-bold text-green-800 block mb-1">{t.step2C}</span>
                  {t.step2CDesc}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Specialized Guides per Control Type */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-black">3</span>
              {t.step3Title}
            </h2>

            {/* A: Buttons */}
            <div className="mt-4 border border-stone-200 rounded-lg p-4 bg-stone-50/50">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                {t.buttonsTitle}
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-stone-700 mt-2 pl-2">
                <p>• {t.buttonsHow}</p>
                <p>• {t.buttonsWhat}</p>
                <div className="mt-2">
                  <span className="font-bold">{t.buttonsModes}</span>
                  <ul className="list-none pl-3 mt-1 space-y-1 text-xs">
                    {t.buttonsModesList.map((m, idx) => (
                      <li key={idx}>• {m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* B: Sliders and Knobs */}
            <div className="mt-4 border border-stone-200 rounded-lg p-4 bg-stone-50/50">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                {t.fadersTitle}
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-stone-700 mt-2 pl-2">
                <p>• {t.fadersHow}</p>
                <p>• {t.fadersWhat}</p>
                <p className="font-bold mt-2">{t.fadersAssignments}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                  <div className="bg-white p-2 rounded border border-stone-200">{t.faderPitchDesc}</div>
                  <div className="bg-white p-2 rounded border border-stone-200">{t.faderVolumeDesc}</div>
                  <div className="bg-white p-2 rounded border border-stone-200">{t.faderCrossDesc}</div>
                  <div className="bg-white p-2 rounded border border-stone-200">{t.faderEqDesc}</div>
                  <div className="bg-white p-2 rounded border border-stone-200">{t.faderFilterDesc}</div>
                </div>
              </div>
            </div>

            {/* C: Jog Wheels */}
            <div className="mt-4 border border-stone-200 rounded-lg p-4 bg-stone-50/50">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Disc size={16} className="text-purple-600" />
                {t.jogTitle}
              </h3>
              <div className="text-xs sm:text-sm text-stone-700 mt-2 space-y-2">
                <p>{t.jogDesc1}</p>
                <div className="bg-purple-50 border border-purple-200 rounded p-3 text-xs text-purple-950">
                  {t.jogDesc2}
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Manual numeric override */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-black">4</span>
              {t.step4Title}
            </h2>
            <p className="text-sm text-stone-700 mt-2">
              {t.step4Desc}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-center">
              <div className="border border-stone-300 rounded p-2 bg-stone-50">
                <span className="font-mono font-bold block text-sm">CH</span>
                {t.chLabel}
              </div>
              <div className="border border-stone-300 rounded p-2 bg-stone-50">
                <span className="font-mono font-bold block text-sm">TYPE</span>
                {t.typeLabel}
              </div>
              <div className="border border-stone-300 rounded p-2 bg-stone-50">
                <span className="font-mono font-bold block text-sm">NUM</span>
                {t.numLabel}
              </div>
            </div>
          </section>

          {/* Section 5: Verification & Diagnostics */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-black">5</span>
              {t.step5Title}
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-stone-700 mt-3 leading-relaxed">
              {t.step5Items.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </section>

          {/* Section 6: Unfamiliar / Vintage MIDI Mixers & Consoles */}
          {t.unknownConsolesTitle && (
            <section className="mb-8 rounded-lg border-2 border-amber-500/30 bg-amber-50/40 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-base sm:text-lg border-b border-amber-200 pb-2">
                <Sliders size={20} className="text-amber-600" />
                <h2>{t.unknownConsolesTitle}</h2>
              </div>
              <p className="text-stone-700 text-xs sm:text-sm mt-2 mb-4 font-medium">
                {t.unknownConsolesSubtitle}
              </p>
              <div className="space-y-3">
                {t.unknownPointers?.map((pt, i) => (
                  <div key={i} className="bg-white border border-amber-200/80 rounded-md p-3 text-xs sm:text-sm text-stone-800 shadow-2xs">
                    <h3 className="font-bold text-amber-950 mb-1">{pt.title}</h3>
                    <p className="text-stone-600 leading-relaxed">{pt.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Troubleshooting callout */}
          <section className="bg-stone-50 border border-stone-300 rounded-lg p-5">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-600" />
              {t.troubleTitle}
            </h3>
            <div className="mt-3 space-y-3 text-xs sm:text-sm text-stone-700">
              <div>
                <strong>Q:</strong> <em>{t.trouble1Q}</em>
                <br />
                <strong>A:</strong> {t.trouble1A}
              </div>
              <div>
                <strong>Q:</strong> <em>{t.trouble2Q}</em>
                <br />
                <strong>A:</strong> {t.trouble2A}
              </div>
              <div>
                <strong>Q:</strong> <em>{t.trouble3Q}</em>
                <br />
                <strong>A:</strong> {t.trouble3A}
              </div>
            </div>
          </section>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-stone-200 text-center text-xs text-stone-500">
            {t.footerText}
          </div>
        </div>
      </main>
    </div>
  );
}