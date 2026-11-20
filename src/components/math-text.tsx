import { type ReactNode } from "react";
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Tokenizes text containing:
 * - Display math: `$$...$$`
 * - Inline math: `$...$`
 * - Bold: `**...**`
 * - Inline code: `` `...` ``
 * Renders formulas with KaTeX and formatting with accessible React nodes.
 */
export function MathText({ text, className = "" }: MathTextProps) {
  if (!text) return null;

  // Split text by display math ($$...$$) first, then inline math ($...$), bold, and inline code
  const pattern = /(\$\$[\s\S]+?\$\$|\$(?!\s)[^$\n]+?(?<!\s)\$|\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("$$")) {
      const formula = token.slice(2, -2).trim();
      let html = "";
      try {
        html = katex.renderToString(formula, {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        html = "";
      }

      nodes.push(
        <span
          key={`block-math-${index}`}
          className="my-3 block overflow-x-auto py-1 text-center font-normal selection:bg-primary/20"
          dangerouslySetInnerHTML={{ __html: html || formula }}
        />
      );
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const formula = token.slice(1, -1).trim();
      let html = "";
      try {
        html = katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        html = "";
      }

      nodes.push(
        <span
          key={`inline-math-${index}`}
          className="inline-block px-0.5 align-baseline font-normal selection:bg-primary/20"
          dangerouslySetInnerHTML={{ __html: html || formula }}
        />
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`b-${index}`} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`c-${index}`}
          className="border border-border bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
}
