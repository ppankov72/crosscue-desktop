// P2 — Server-side HTML sanitizer for DocumentationArticle and FaqEntry content.
// Prevents stored XSS by stripping dangerous tags, attributes, and URLs.
// Allows: p, h2, h3, strong, em, ul, ol, li, a, code, pre, img, br, blockquote, figure, figcaption
// Strips: script, iframe, object, embed, form, input, style, meta, link, svg, math
// Strips: javascript: URLs, data: URLs (except images), on* event handlers

const ALLOWED_TAGS = new Set([
  'p', 'h2', 'h3', 'h4', 'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li', 'a', 'code', 'pre', 'br', 'blockquote',
  'img', 'figure', 'figcaption', 'span', 'div', 'hr'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  span: new Set(['class']),
  div: new Set(['class']),
  figure: new Set(['class']),
  figcaption: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
};

function isDangerousUrl(url: string): boolean {
  const trimmed = (url || '').trim().toLowerCase();
  if (trimmed.startsWith('javascript:')) return true;
  if (trimmed.startsWith('vbscript:')) return true;
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return true;
  return false;
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Remove HTML comments
  let result = html.replace(/<!--[\s\S]*?-->/g, '');
  // Remove dangerous tags AND their content (script, style, iframe, object, embed, form, noscript, svg, math)
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<script[^>]*>[\s\S]*$/gi, '');
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  result = result.replace(/<object[\s\S]*?<\/object>/gi, '');
  result = result.replace(/<embed[\s\S]*?<\/embed>/gi, '');
  result = result.replace(/<form[\s\S]*?<\/form>/gi, '');
  result = result.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  result = result.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  result = result.replace(/<math[\s\S]*?<\/math>/gi, '');
  // Process tags — preserve closing tags, strip disallowed tags/attrs
  result = result.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*?)\/?>/g, (match, closingSlash, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    // Closing tags: no attributes, just return </tag>
    if (closingSlash) return `</${tag}>`;
    const allowedForTag = ALLOWED_ATTRS[tag] || new Set<string>();
    // Clean attributes
    const cleanAttrs = attrs.replace(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g, (m, attrName, attrValue) => {
      const attr = attrName.toLowerCase();
      if (!allowedForTag.has(attr)) return '';
      if (attr === 'href' || attr === 'src') {
        if (isDangerousUrl(attrValue)) return '';
      }
      if (attr.startsWith('on')) return '';
      // Force rel="noopener noreferrer" on target=_blank
      if (attr === 'target' && attrValue === '_blank') {
        return `${attr}="${attrValue}" rel="noopener noreferrer"`;
      }
      return `${attr}="${attrValue}"`;
    }).replace(/([a-zA-Z-]+)\s*=\s*'([^']*)'/g, (m, attrName, attrValue) => {
      const attr = attrName.toLowerCase();
      if (!allowedForTag.has(attr)) return '';
      if (attr === 'href' || attr === 'src') {
        if (isDangerousUrl(attrValue)) return '';
      }
      if (attr.startsWith('on')) return '';
      return `${attr}="${attrValue}"`;
    }).trim();
    // Remove standalone on* attributes without quotes
    const finalAttrs = cleanAttrs.replace(/\son[a-zA-Z]+\s*=\s*[^\s"'>]+/gi, '').trim();
    if (tag === 'br' || tag === 'hr' || tag === 'img') {
      return `<${tag}${finalAttrs ? ' ' + finalAttrs : ''} />`;
    }
    return `<${tag}${finalAttrs ? ' ' + finalAttrs : ''}>`;
  });
  return result;
}