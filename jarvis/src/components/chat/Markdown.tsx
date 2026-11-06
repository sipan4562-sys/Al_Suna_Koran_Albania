"use client";

import { isValidElement, memo, useMemo, type ReactElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/client/cn";
import { nodeText, splitMarkdownBlocks } from "@/lib/client/markdown-blocks";
import { CodeBlock } from "./CodeBlock";

const components: Components = {
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    if (isValidElement(child)) {
      const element = child as ReactElement<{ className?: string; children?: React.ReactNode }>;
      const className = element.props.className ?? "";
      const language = /language-([\w+#-]+)/.exec(className)?.[1]?.toLowerCase() ?? "";
      const code = nodeText(element.props.children).replace(/\n$/, "");
      return (
        <CodeBlock language={language} code={code}>
          {element.props.children}
        </CodeBlock>
      );
    }
    return <pre>{children}</pre>;
  },
  a({ href, children }) {
    const safe = href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto rounded-lg">
        <table>{children}</table>
      </div>
    );
  },
  img({ alt }) {
    // Externe Bilder werden aus Datenschutz- und CSP-Gründen nicht geladen.
    return <span className="text-ink-faint">[Bild: {alt || "ohne Beschreibung"}]</span>;
  },
};

const MarkdownBlock = memo(function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
      {content}
    </ReactMarkdown>
  );
});

/**
 * Markdown mit GFM (Tabellen, Listen, Durchstreichen) und Syntax-Highlighting.
 * Rohes HTML wird nicht gerendert (Schutz vor XSS).
 */
export const Markdown = memo(function Markdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  const blocks = useMemo(() => splitMarkdownBlocks(content), [content]);
  return (
    <div className={cn("prose-jarvis", streaming && "is-streaming")}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} content={block} />
      ))}
    </div>
  );
});
