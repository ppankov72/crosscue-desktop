import { useRef, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { base44 } from '@/api/base44Client';

// P2 — Rich text editor wrapper with image upload via UploadFile.
// Uses react-quill-new with a curated toolbar (no raw HTML mode).
// Images are uploaded to storage and referenced by URL (no base64 in body).
const MODULES = {
  toolbar: {
    container: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'code'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image', 'blockquote'],
      ['clean'],
    ],
    handlers: { image: function () { this.quillImageHandler(); } },
  },
};

export default function ContentRichTextEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);

  const handleImage = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', file_url);
          quill.setSelection(range.index + 1);
        }
      } catch (e) {
        alert('Image upload failed: ' + (e.message || 'unknown error'));
      }
    };
  }, []);

  const modules = {
    ...MODULES,
    toolbar: {
      ...MODULES.toolbar,
      handlers: { ...MODULES.toolbar.handlers, image: handleImage },
    },
  };

 return (
  <div className="rich-text-editor">
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value || ''}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder || 'Write content...'}
    />

    <style>{`
      .rich-text-editor .ql-toolbar {
        background: #ffffff;
        border-color: #d6d3d1;
      }

      .rich-text-editor .ql-container {
        background: #ffffff;
        border-color: #d6d3d1;
        color: #1c1917;
        font-size: 14px;
      }

      .rich-text-editor .ql-editor {
        min-height: 200px;
        color: #1c1917 !important;
        background: #ffffff !important;
      }

      .rich-text-editor .ql-editor p,
      .rich-text-editor .ql-editor h1,
      .rich-text-editor .ql-editor h2,
      .rich-text-editor .ql-editor h3,
      .rich-text-editor .ql-editor li,
      .rich-text-editor .ql-editor blockquote {
        color: #1c1917 !important;
      }

      .rich-text-editor .ql-editor.ql-blank::before {
        color: #a8a29e !important;
        font-style: normal;
      }
    `}</style>
  </div>
);
}