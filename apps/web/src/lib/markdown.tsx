import * as React from "react";

/**
 * Markdown mínimo do thread (paridade com o WootWriter/MarkdownRenderer do
 * Chatwoot v4): **negrito**, *itálico*, `código`, [links](https://...),
 * autolinks, > citações e listas (- / 1.). Sem dependências; sem
 * dangerouslySetInnerHTML (React escapa o texto) e links restritos a
 * http(s) para evitar javascript:.
 */

// Nota: não há dangerouslySetInnerHTML aqui — strings vão como children do
// React, que já escapa `<`, `>` e `&`. Nenhum escape manual é necessário.

function isSafeUrl(url: string): boolean {
  return /^https?:\/\/[^\s<>"']+$/i.test(url.trim());
}

function renderInline(source: string, keyPrefix: string): React.ReactNode[] {
  // Divide por `código` primeiro para proteger o conteúdo interno.
  const parts = source.split(/(`[^`]+`)/g);
  const result: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      result.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-woot-slate-3 px-1 py-px font-mono text-[13px]"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else {
      result.push(...renderInlineLinks(part, `${keyPrefix}-t${i}`));
    }
  }
  return result;
}

function renderInlineLinks(source: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // [texto](url) ou URL solta.
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>"']+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const pushStyled = (text: string, key: string) => {
    // **negrito** depois *itálico* (escapado, então seguro para aninhar).
    const boldSplit = text.split(/(\*\*[^*]+\*\*)/g);
    boldSplit.forEach((chunk, bi) => {
      const bold = /^\*\*([^*]+)\*\*$/.exec(chunk);
      if (bold) {
        out.push(
          <strong key={`${key}-b${bi}`} className="font-semibold">
            {renderItalic(bold[1], `${key}-b${bi}`)}
          </strong>,
        );
        return;
      }
      renderItalic(chunk, `${key}-i${bi}`).forEach((n) => out.push(n));
    });
  };
  while ((m = re.exec(source)) !== null) {
    if (m.index > last) pushStyled(source.slice(last, m.index), `${keyPrefix}-s${k++}`);
    const [full, label, href, autolink] = m;
    const url = href ?? autolink;
    if (isSafeUrl(url)) {
      out.push(
        <a
          key={`${keyPrefix}-a${k++}`}
          href={url.trim()}
          target="_blank"
          rel="noreferrer noopener"
          className="text-woot-blue underline underline-offset-2 hover:opacity-80"
        >
          {renderItalic(label ?? autolink, `${keyPrefix}-al${k}`)}
        </a>,
      );
    } else {
      pushStyled(full, `${keyPrefix}-x${k++}`);
    }
    last = m.index + full.length;
  }
  if (last < source.length) pushStyled(source.slice(last), `${keyPrefix}-s${k++}`);
  return out;
}

function renderItalic(source: string, keyPrefix: string): React.ReactNode[] {
  return source.split(/(\*[^*\n]+\*)/g).map((chunk, i) => {
    const m = /^\*([^*\n]+)\*$/.exec(chunk);
    return m ? (
      <em key={`${keyPrefix}-e${i}`}>{m[1]}</em>
    ) : (
      <React.Fragment key={`${keyPrefix}-f${i}`}>{chunk}</React.Fragment>
    );
  });
}

/** Renderiza o conteúdo da mensagem com markdown básico e HTML escapado. */
export function renderMessageContent(content: string | null | undefined): React.ReactNode {
  if (!content) return null;
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    list = null;
    const Tag = ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`b${key++}`} className={ordered ? "list-decimal pl-5" : "list-disc pl-5"}>
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li${key}-${i}`)}</li>
        ))}
      </Tag>,
    );
  };

  for (const line of lines) {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const item = (bullet?.[1] ?? ordered?.[1] ?? "").trim();
      if (!item) {
        flushList();
        continue;
      }
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(item);
      continue;
    }
    flushList();
    if (quote) {
      blocks.push(
        <blockquote
          key={`b${key++}`}
          className="border-l-2 border-woot-blue pl-2 text-woot-slate-11"
        >
          {renderInline(quote[1], `q${key}`)}
        </blockquote>,
      );
    } else if (line.trim() === "") {
      blocks.push(<br key={`b${key++}`} />);
    } else {
      blocks.push(
        <React.Fragment key={`b${key++}`}>{renderInline(line, `p${key}`)}</React.Fragment>,
      );
      // quebra de linha dentro do mesmo parágrafo
      blocks.push(<br key={`b${key++}`} />);
    }
  }
  flushList();
  // remove o <br/> pendente do fim
  const last = blocks[blocks.length - 1];
  if (React.isValidElement(last) && last.type === "br") blocks.pop();
  return <>{blocks}</>;
}

/** Texto puro (title/tooltip): markdown sem formatação. */
export function stripMarkdown(content: string): string {
  return content
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)([^*_]+)\1/g, "$2")
    .replace(/(\*|_)([^*_]+)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "");
}
