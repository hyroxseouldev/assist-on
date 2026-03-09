import sanitizeHtml from "sanitize-html";

function normalizePlainTextLineBreaks(inputHtml: string) {
  const trimmed = inputHtml.trim();

  if (!trimmed) {
    return "";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return inputHtml;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function normalizeMixedContentLineBreaks(inputHtml: string) {
  return inputHtml.replace(/(^|>)([^<]+)(?=<|$)/g, (match, prefix: string, text: string) => {
    if (!text.includes("\n")) {
      return match;
    }

    const normalizedText = text.replace(/\n{2,}/g, "<br /><br />").replace(/\n/g, "<br />");
    return `${prefix}${normalizedText}`;
  });
}

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
  const normalized = normalizePlainTextLineBreaks(inputHtml);

  return sanitizeHtml(normalizeMixedContentLineBreaks(normalized), {
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
