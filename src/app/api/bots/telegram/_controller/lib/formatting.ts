export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/`/g, "\\`");
}

export function codeBlock(text: string, language?: string): string {
  if (language) {
    return `\`\`\`${language}\n${text}\n\`\`\``;
  }
  return `\`\`\`\n${text}\n\`\`\``;
}

export function inlineCode(text: string): string {
  return `\`${text}\``;
}

export function bold(text: string): string {
  const escapedText = escapeMarkdown(text);
  return `*${escapedText}*`;
}

export function italic(text: string): string {
  const escapedText = escapeMarkdown(text);
  return `_${escapedText}_`;
}

export function link(text: string, url: string): string {
  const escapedText = escapeMarkdown(text);
  const escapedUrl = url.replace(/\\/g, "\\\\").replace(/\)/g, "\\)");
  return `[${escapedText}](${escapedUrl})`;
}
