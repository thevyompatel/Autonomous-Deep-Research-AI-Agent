/**
 * Markdown pipeline for model-written reports. Raw HTML is never parsed
 * (react-markdown ignores it without rehype-raw) and the tree is sanitized
 * before our own trusted plugins add heading ids and citation elements.
 */
import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import type { Options } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { INSUFFICIENT_EVIDENCE, splitCitations } from "@/lib/citations";

const SKIP = new Set(["a", "code", "pre"]);
const FLAGGABLE = new Set(["p", "li", "td"]);

function textOf(node: Element | RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function citationNodes(text: Text): ElementContent[] {
  const segments = splitCitations(text.value);
  if (segments.length === 1 && segments[0]?.type === "text") return [text];
  return segments.map((segment): ElementContent =>
    segment.type === "text"
      ? { type: "text", value: segment.value }
      : {
          type: "element",
          tagName: "span",
          properties: { dataCite: segment.numbers.join(","), dataTrail: segment.trail },
          children: [],
        },
  );
}

function transform(children: RootContent[], skip: boolean): RootContent[] {
  const out: RootContent[] = [];
  for (const child of children) {
    if (child.type === "text" && !skip) {
      out.push(...citationNodes(child));
    } else if (child.type === "element") {
      child.children = transform(child.children, skip || SKIP.has(child.tagName)) as ElementContent[];
      if (FLAGGABLE.has(child.tagName) && INSUFFICIENT_EVIDENCE.test(textOf(child))) {
        child.properties = { ...child.properties, dataInsufficient: "true" };
      }
      out.push(child);
    } else {
      out.push(child);
    }
  }
  return out;
}

/** Replace [n] citation text with <span data-cite="n,m" data-trail="."> elements. */
export function rehypeCitations() {
  return (tree: Root) => {
    tree.children = transform(tree.children, false);
  };
}

/** GitHub's schema, keeping language classes on code blocks. */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./]],
  },
};

export const remarkPlugins: Options["remarkPlugins"] = [remarkGfm];
// Order matters: sanitize first, then add trusted ids and citation markers.
export const rehypePlugins: Options["rehypePlugins"] = [
  [rehypeSanitize, schema],
  rehypeSlug,
  rehypeCitations,
];

/** Read a data-* property that rehype stored on a hast element. */
export function dataProp(node: Element | undefined, name: string): string | null {
  const value = node?.properties?.[name];
  if (value === undefined || value === null || value === false) return null;
  return Array.isArray(value) ? value.join(",") : String(value);
}
