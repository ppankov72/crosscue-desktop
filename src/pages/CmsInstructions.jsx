import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

const CONTENT = [
  { type: 'h1', text: 'Инструкция за мигриране на портала в CMS' },
  { type: 'p', text: 'Създадената CMS система ви позволява да управлявате цялото съдържание на публичния портал — заглавна страница, навигация, футър, медия и глобални стилове — без да променяте код. Системата работи с работни версии (draft) и публикувани версии (published), с възможност за връщане към предишна версия (rollback).' },
  { type: 'p', text: 'Достъп: Влезте в приложението като администратор и отворете /admin/cms (от менюто в Control Room → CMS).' },

  { type: 'h2', text: 'Стъпка 1: Миграция на съществуващото съдържание' },
  { type: 'p', text: 'При първо отваряне на CMS страницата ще видите съобщение „CMS Migration Required“.' },
  { type: 'ol', items: [
    'Кликнете бутона „Migrate Content to CMS“.',
    'Системата автоматично ще създаде записи за всички страници (Home, Privacy, Terms, Impressum, Contact) от съществуващите преводи, пренесе всички редакции от старата система (LandingContent) в новите CMS записи, създаде настройки за навигация, футър и тема, и публикува всичко веднага.',
    'След миграцията ще видите табовете: Pages | Navigation | Footer | Media | Global Styles.',
  ]},
  { type: 'quote', text: 'Важно: Миграцията е идемпотентна — ако я стартирате повторно, съществуващите записи няма да бъдат презаписани.' },

  { type: 'h2', text: 'Стъпка 2: Редактиране на страници (Pages)' },
  { type: 'h3', text: 'Избор на страница' },
  { type: 'ul', items: [
    'В левия панел виждате списък с всички страници.',
    'Зелена точка = публикувана; жълта точка = има непубликувани промени.',
    'Кликнете страница, за да я редактирате.',
  ]},
  { type: 'h3', text: 'Метаданни на страницата' },
  { type: 'ul', items: [
    'Title — вътрешно име на страницата.',
    'Slug — URL адрес (не се променя след създаване).',
    'Display Order — подредба в списъка.',
    'Nav visible — дали страницата да се показва в навигацията.',
    'Footer visible — дали страницата да се показва във футъра.',
  ]},
  { type: 'h3', text: 'Секции' },
  { type: 'p', text: 'Всяка страница е съставена от секции (Hero, Live Demo, Why, Features, Demo Tracks, Pricing, Downloads, Community, Docs и др.).' },
  { type: 'p', text: 'Операции със секции:' },
  { type: 'ul', items: [
    '+ Add section — добавя нова секция.',
    'Eye / EyeOff — показва/скрива секция.',
    '↑ / ↓ — премества секцията нагору/надолу.',
    'Copy — дублира секцията.',
    'Trash — изтрива секцията.',
  ]},
  { type: 'p', text: 'Редактиране на елементи: Всеки текстов елемент има 4 полета — EN, DE, ES, BG. Въведете превода за всеки език. Ако поле е празно, системата използва английския (EN) като резервен.' },
  { type: 'p', text: 'Стилове на секцията: Разгънете „Section Styles“ за да зададете Background (цвят на фона), Text Color (цвят на текста), Heading Color (цвят на заглавията).' },
  { type: 'h3', text: 'Запазване и публикуване' },
  { type: 'ul', items: [
    'Save Draft — запазва промените в черновата (не се отразява на живия сайт).',
    'Publish — публикува черновата веднага.',
    'Rollback — връща към предишната публикувана версия.',
  ]},
  { type: 'quote', text: 'Важно: Промените в черновата НЕ се виждат от посетителите. Трябва да кликнете Publish, за да ги публикувате.' },

  { type: 'h2', text: 'Стъпка 3: Редактиране на навигацията (Navigation)' },
  { type: 'ol', items: [
    'Отидете на таб Navigation.',
    'Brand Text — текстът на логото (по подразбиране „CROSSCUE“).',
    'Logo URL — URL на изображение за лого (оставете празно за текстово лого).',
    'Navigation Items — списък с линкове. Кликнете + Add за нов елемент. За всеки елемент въведете URL, Label (за всеки език) и Enabled.',
    'Save Draft → Publish за да приложите промените.',
  ]},

  { type: 'h2', text: 'Стъпка 4: Редактиране на футъра (Footer)' },
  { type: 'ol', items: [
    'Отидете на таб Footer.',
    'Tagline, Subtitle, Rights — основни текстове (многоезични).',
    'Columns — колони с линкове. + Add Column добавя нова. За всяка колона въведете заглавие и линкове.',
    'Legal Links — правни линкове (Privacy, Terms, Contact). + Add legal link добавя нов.',
    'Save Draft → Publish.',
  ]},

  { type: 'h2', text: 'Стъпка 5: Медийна библиотека (Media)' },
  { type: 'ol', items: [
    'Отидете на таб Media.',
    'Upload — изберете изображение от компютъра си.',
    'За всяко изображение редактирайте Title, Alt text и копирайте URL за използване в секции.',
    'Trash — изтрива изображението.',
  ]},

  { type: 'h2', text: 'Стъпка 6: Глобални стилове (Global Styles / Theme)' },
  { type: 'ol', items: [
    'Отидете на таб Global Styles.',
    'Colors — глобална цветова палитра (background, contentBg, primary, secondary, accent, text, heading, muted, border).',
    'Typography — типографски настройки за 5 роли: Body, Heading, Navigation, Button, Footer.',
    'Save Draft → Publish за да приложите стиловете глобално.',
  ]},

  { type: 'h2', text: 'Стъпка 7: Многоезична поддръжка' },
  { type: 'p', text: 'Цялата CMS система поддържа 4 езика: English (EN), Deutsch (DE), Español (ES), Български (BG). Всеки текстов елемент има отделно поле за всеки език. Ако даден превод липсва, системата използва английския като резервен.' },

  { type: 'h2', text: 'Стъпка 8: Workflow за публикуване' },
  { type: 'ol', items: [
    'Редактирайте — правите промени в черновата (Save Draft).',
    'Прегледайте — проверете всички промени.',
    'Публикувайте — кликнете Publish.',
    'Върнете ако нужно — кликнете Rollback за предишната версия.',
  ]},
  { type: 'quote', text: 'Безопасност: Само администратори могат да редактират CMS. Обикновените потребители виждат само публикуваното съдържание.' },

  { type: 'h2', text: 'Често задавани въпроси' },
  { type: 'p', text: 'В: Може ли миграцията да се стартира повторно? О: Да, тя е идемпотентна.' },
  { type: 'p', text: 'В: Какво се случва ако не публикувам? О: Промените остават в черновата и не се виждат от посетителите.' },
  { type: 'p', text: 'В: Мога ли да върна промените? О: Да, чрез бутона Rollback.' },
  { type: 'p', text: 'В: Влияе ли CMS на Studio? О: Не, CMS управлява само публичния портал.' },
];

export default function CmsInstructions() {
  const [generating, setGenerating] = useState(false);

  const downloadPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (needed) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      for (const block of CONTENT) {
        if (block.type === 'h1') {
          checkPageBreak(20);
          doc.setFontSize(18);
          doc.setTextColor(180, 83, 9);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(block.text, maxWidth);
          doc.text(lines, margin, y);
          y += lines.length * 8 + 4;
          doc.setDrawColor(217, 119, 6);
          doc.setLineWidth(0.5);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
        } else if (block.type === 'h2') {
          checkPageBreak(16);
          y += 4;
          doc.setFontSize(14);
          doc.setTextColor(146, 64, 14);
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(block.text, maxWidth);
          doc.text(lines, margin, y);
          y += lines.length * 6 + 2;
          doc.setDrawColor(231, 229, 228);
          doc.setLineWidth(0.3);
          doc.line(margin, y, pageWidth - margin, y);
          y += 4;
        } else if (block.type === 'h3') {
          checkPageBreak(12);
          doc.setFontSize(11);
          doc.setTextColor(120, 113, 108);
          doc.setFont('helvetica', 'bold');
          doc.text(block.text, margin, y);
          y += 6;
        } else if (block.type === 'p') {
          doc.setFontSize(10);
          doc.setTextColor(28, 25, 23);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(block.text, maxWidth);
          checkPageBreak(lines.length * 5);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 2;
        } else if (block.type === 'ul' || block.type === 'ol') {
          doc.setFontSize(10);
          doc.setTextColor(28, 25, 23);
          doc.setFont('helvetica', 'normal');
          block.items.forEach((item, i) => {
            const prefix = block.type === 'ol' ? `${i + 1}. ` : '•  ';
            const lines = doc.splitTextToSize(item, maxWidth - 8);
            checkPageBreak(lines.length * 5 + 1);
            doc.text(prefix + lines[0], margin + 4, y);
            for (let j = 1; j < lines.length; j++) {
              y += 5;
              checkPageBreak(5);
              doc.text(lines[j], margin + 8, y);
            }
            y += lines.length * 5 + 1;
          });
          y += 2;
        } else if (block.type === 'quote') {
          doc.setFontSize(9);
          doc.setTextColor(120, 53, 15);
          doc.setFont('helvetica', 'italic');
          const lines = doc.splitTextToSize(block.text, maxWidth - 8);
          checkPageBreak(lines.length * 5 + 4);
          doc.setFillColor(254, 243, 199);
          doc.rect(margin, y - 4, maxWidth, lines.length * 5 + 4, 'F');
          doc.setDrawColor(217, 119, 6);
          doc.setLineWidth(1);
          doc.line(margin, y - 4, margin, y + lines.length * 5);
          doc.text(lines, margin + 4, y);
          y += lines.length * 5 + 6;
        }
      }

      // Footer on last page
      doc.setFontSize(8);
      doc.setTextColor(168, 162, 158);
      doc.setFont('helvetica', 'normal');
      doc.text('CrossCue CMS — Инструкция за миграция · Септември 2026', pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.save('CrossCue_CMS_Migration_Instructions_BG.pdf');
    } catch (err) {
      alert('Грешка при генериране на PDF: ' + err.message);
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-amber-600" />
            <span className="font-serif text-base font-bold tracking-wider text-stone-900">CMS Инструкция</span>
          </div>
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {generating ? 'Генериране...' : 'Свали PDF'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            📄 Кликнете бутона „Свали PDF“ за да изтеглите инструкциите като PDF файл на вашия телефон.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {CONTENT.map((block, i) => {
            if (block.type === 'h1') return <h1 key={i} className="border-b-2 border-amber-600 pb-2 text-2xl font-bold text-amber-800">{block.text}</h1>;
            if (block.type === 'h2') return <h2 key={i} className="mt-6 border-b border-stone-200 pb-1 text-lg font-bold text-amber-700">{block.text}</h2>;
            if (block.type === 'h3') return <h3 key={i} className="mt-4 text-base font-bold text-stone-600">{block.text}</h3>;
            if (block.type === 'p') return <p key={i} className="text-sm leading-relaxed text-stone-700">{block.text}</p>;
            if (block.type === 'ul') return <ul key={i} className="list-disc space-y-1 pl-6 text-sm text-stone-700">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>;
            if (block.type === 'ol') return <ol key={i} className="list-decimal space-y-1 pl-6 text-sm text-stone-700">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ol>;
            if (block.type === 'quote') return <blockquote key={i} className="border-l-3 border-amber-600 bg-amber-50 px-4 py-2 text-sm italic text-amber-900">{block.text}</blockquote>;
            return null;
          })}
        </div>
      </div>
    </div>
  );
}