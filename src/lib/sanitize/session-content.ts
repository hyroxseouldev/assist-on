import sanitizeHtml from "sanitize-html";

const allowedTags: sanitizeHtml.IOptions["allowedTags"] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
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
  "img",
];

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  img: ["src", "alt"],
};

export function sanitizeSessionContent(inputHtml: string) {
  return sanitizeHtml(inputHtml, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto", "data"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
      img: sanitizeHtml.simpleTransform("img", {
        loading: "lazy",
      }),
    },
  });
}
