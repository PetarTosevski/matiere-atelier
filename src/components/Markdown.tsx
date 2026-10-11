import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type Props = { children: string; className?: string };

/** Renders artwork descriptions. Raw HTML is dropped, output is sanitized. */
export function Markdown({ children, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        skipHtml
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
