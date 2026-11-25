import type { CSSProperties } from 'react';
import type { GrammarState, HighlighterCore } from 'shiki/core';

import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

interface ShikiTokenStyle extends CSSProperties {
  '--shiki-light'?: string;
  '--shiki-dark'?: string;
}

// Add the languages you need. Each one loads the first time it is used.
const languages = {
  bash: async () => await import('shiki/langs/shellscript.mjs'),
  css: async () => await import('shiki/langs/css.mjs'),
  diff: async () => await import('shiki/langs/diff.mjs'),
  html: async () => await import('shiki/langs/html.mjs'),
  javascript: async () => await import('shiki/langs/javascript.mjs'),
  json: async () => await import('shiki/langs/json.mjs'),
  jsx: async () => await import('shiki/langs/jsx.mjs'),
  markdown: async () => await import('shiki/langs/markdown.mjs'),
  python: async () => await import('shiki/langs/python.mjs'),
  sql: async () => await import('shiki/langs/sql.mjs'),
  tsx: async () => await import('shiki/langs/tsx.mjs'),
  typescript: async () => await import('shiki/langs/typescript.mjs'),
  yaml: async () => await import('shiki/langs/yaml.mjs'),
};

const languageAliases = new Map<string, keyof typeof languages>([
  ['bash', 'bash'],
  ['css', 'css'],
  ['diff', 'diff'],
  ['html', 'html'],
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['json', 'json'],
  ['jsx', 'jsx'],
  ['markdown', 'markdown'],
  ['md', 'markdown'],
  ['py', 'python'],
  ['python', 'python'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['shellscript', 'bash'],
  ['sql', 'sql'],
  ['ts', 'typescript'],
  ['tsx', 'tsx'],
  ['typescript', 'typescript'],
  ['yaml', 'yaml'],
  ['yml', 'yaml'],
  ['zsh', 'bash'],
]);

let highlighter: Promise<HighlighterCore> | undefined;

const getHighlighter = async () => {
  highlighter ??= createHighlighterCore({
    themes: [
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });

  return await highlighter;
};

const getLanguage = (
  language: string,
): 'ansi' | keyof typeof languages | null => {
  const name = language.toLowerCase();

  if (name === 'ansi') {
    return name;
  }

  return languageAliases.get(name) ?? null;
};

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export async function loadHighlighter(language: string) {
  const lang = getLanguage(language);

  if (lang === null) {
    return null;
  }

  const shiki = await getHighlighter();

  if (lang !== 'ansi' && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang]);
  }

  return {
    // Returns one React node per line, and the grammar state after the last
    // line. Pass that state back to continue where the code left off.
    highlight(code: string, state?: GrammarState) {
      const tokenize = (text: string) =>
        shiki.codeToTokens(text, {
          lang,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
          grammarState: state,
        }).tokens;

      // ANSI has no grammar state, so each line is tokenized on its own and
      // gets the same colors whether it arrives in one piece or streams.
      const tokens =
        lang === 'ansi'
          ? code.split('\n').flatMap((line) => tokenize(line))
          : tokenize(code);

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => (
            <span
              className="text-(--shiki-light) dark:text-(--shiki-dark)"
              key={index}
              style={
                // SAFETY: Shiki CSS custom properties extend CSSProperties for light/dark token colors.
                // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- Shiki syntax highlighting binds per-token CSS custom properties.
                {
                  '--shiki-light': token.htmlStyle?.['--shiki-light'],
                  '--shiki-dark': token.htmlStyle?.['--shiki-dark'],
                } as ShikiTokenStyle
              }
            >
              {token.content}
            </span>
          )),
        ),
        state: shiki.getLastGrammarState(tokens),
      };
    },
  };
}

// Returns one React node per line, or null for a language that is not listed.
export async function highlightCode(code: string, language: string) {
  const loadedHighlighter = await loadHighlighter(language);

  return loadedHighlighter ? loadedHighlighter.highlight(code).lines : null;
}
