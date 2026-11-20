import type { ReactNode } from 'react';
import katex from 'katex';

/**
 * Renders a small subset of Markdown using React elements only.
 *
 * AI output is untrusted input: a malicious answer sheet or rubric can attempt
 * to steer the model into returning HTML. Nothing here is interpreted as HTML —
 * every character is rendered as text or sanitized KaTeX math.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\$(?!\s)[^$\n]+?(?<!\s)\$|\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let lastIndex = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('$$')) {
      const formula = token.slice(2, -2).trim();
      let html = '';
      try {
        html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
      } catch {
        html = '';
      }
      nodes.push(
        <span
          key={`${keyPrefix}-bm-${index}`}
          className="my-2 block overflow-x-auto py-1 text-center font-normal selection:bg-primary/20"
          dangerouslySetInnerHTML={{ __html: html || formula }}
        />
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const formula = token.slice(1, -1).trim();
      let html = '';
      try {
        html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
      } catch {
        html = '';
      }
      nodes.push(
        <span
          key={`${keyPrefix}-im-${index}`}
          className="inline-block px-0.5 align-baseline font-normal selection:bg-primary/20"
          dangerouslySetInnerHTML={{ __html: html || formula }}
        />
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${index}`} className="font-bold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${index}`}
          className="border border-border bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export function SafeMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
          inFence = !inFence;
          return null;
        }

        if (inFence) {
          return (
            <pre
              key={lineIndex}
              className="overflow-x-auto border border-border bg-muted p-2 font-mono text-xs"
            >
              {line}
            </pre>
          );
        }

        if (!trimmed) {
          return <div key={lineIndex} className="h-2" aria-hidden="true" />;
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          return <hr key={lineIndex} className="border-border" />;
        }

        const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <p key={lineIndex} className="font-display text-base font-bold">
              {renderInline(heading[1], `h-${lineIndex}`)}
            </p>
          );
        }

        const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
        if (bullet) {
          return (
            <p key={lineIndex} className="flex gap-2 pl-2">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>{renderInline(bullet[1], `u-${lineIndex}`)}</span>
            </p>
          );
        }

        const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <p key={lineIndex} className="flex gap-2 pl-2">
              <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
                {numbered[1]}.
              </span>
              <span>{renderInline(numbered[2], `o-${lineIndex}`)}</span>
            </p>
          );
        }

        return <p key={lineIndex}>{renderInline(trimmed, `p-${lineIndex}`)}</p>;
      })}
    </div>
  );
}
