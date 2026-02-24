import sanitizeHtml from "sanitize-html";

const allowedTags: sanitizeHtml.IOptions["allowedTags"] = [
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "a",
  "blockquote",
  "hr",
  "br",
  "code",
  "pre",
];

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
};

export function sanitizeSessionContent(inputHtml: string) {
  return sanitizeHtml(inputHtml, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}
