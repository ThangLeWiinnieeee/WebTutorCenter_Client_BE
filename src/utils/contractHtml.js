const sanitizeHtml = require("sanitize-html");

const sanitizeContractHtml = (html) =>
  sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "p",
      "div",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
    ],
    allowedAttributes: {
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      p: ["style"],
      div: ["style"],
      blockquote: ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
      },
    },
  });

const normalizeContractHtml = (html) => {
  const sanitized = sanitizeContractHtml(html);
  const text = sanitizeHtml(sanitized, { allowedTags: [], allowedAttributes: {} }).trim();
  return text ? sanitized : "";
};

module.exports = { sanitizeContractHtml, normalizeContractHtml };
