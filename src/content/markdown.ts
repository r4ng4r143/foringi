export function renderMarkdown(raw: string): string {
  return raw
    .trim()
    .split(/\n{2,}/)
    .map(block => {
      const html = block
        .replace(/\n/g, ' ')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return `<p>${html}</p>`;
    })
    .join('');
}
