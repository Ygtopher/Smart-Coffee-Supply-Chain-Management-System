import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateContent } from '../i18nContent';

const originalText = new WeakMap<Text, string>();
const translatedAttrs = ['placeholder', 'aria-label', 'title'] as const;
const originalAttrs = new WeakMap<Element, Partial<Record<(typeof translatedAttrs)[number], string>>>();

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('[data-no-translate], script, style, svg, code, pre')) return true;
  return !node.nodeValue?.trim();
}

function translateElement(element: Element, language: string) {
  translatedAttrs.forEach((attr) => {
    const current = element.getAttribute(attr);
    if (!current) return;

    const stored = originalAttrs.get(element) ?? {};
    const original = stored[attr] ?? current;
    if (!stored[attr]) originalAttrs.set(element, { ...stored, [attr]: original });

    const translated = translateContent(original, language);
    if (current !== translated) element.setAttribute(attr, translated);
  });
}

function translateTree(root: ParentNode, language: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  nodes.forEach((node) => {
    if (shouldSkipTextNode(node)) return;
    const original = originalText.get(node) ?? node.nodeValue ?? '';
    originalText.set(node, original);
    const translated = translateContent(original, language);
    if (node.nodeValue !== translated) node.nodeValue = translated;
  });

  if (root instanceof Element) translateElement(root, language);
  root.querySelectorAll?.('[placeholder], [aria-label], [title]').forEach((element) => {
    translateElement(element, language);
  });
}

export default function AutoTranslate() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const language = i18n.language;
    const appRoot = document.getElementById('root') ?? document.body;
    translateTree(appRoot, language);

    if (language.split('-')[0] === 'en') return;

    let frame = 0;
    const pendingRoots = new Set<ParentNode>();

    const flush = () => {
      frame = 0;
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      roots.forEach((root) => translateTree(root, language));
    };

    const schedule = (root: ParentNode) => {
      pendingRoots.add(root);
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node as Text;
            if (!shouldSkipTextNode(text)) {
              originalText.set(text, text.nodeValue ?? '');
              text.nodeValue = translateContent(text.nodeValue ?? '', language);
            }
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            schedule(node as Element);
          }
        });
      });
    });

    observer.observe(appRoot, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [i18n.language]);

  return null;
}
