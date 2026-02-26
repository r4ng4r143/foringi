export function renderMarkdown(raw: string): string {
  const lines = raw.trim().split('\n');
  const html: string[] = [];
  let i = 0;

  const inline = (text: string) =>
    text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\\([*_`])/g, '$1');

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith('# ')) {
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
      i++; continue;
    }
    if (line.startsWith('### ')) {
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
      i++; continue;
    }

    if (/^\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const cells = (row: string) =>
        row.split('|').slice(1, -1).map(c => c.trim());
      const isSep = (row: string) => /^\|[\s-:|]+\|$/.test(row);

      let tableHtml = '<table>';
      for (let r = 0; r < rows.length; r++) {
        if (isSep(rows[r])) continue;
        const tag = r === 0 ? 'th' : 'td';
        const wrap = r === 0 ? 'thead' : (r === 1 || (r === 2 && isSep(rows[1])) ? 'tbody' : '');
        if (r === 0) tableHtml += '<thead>';
        if ((r === 1 && !isSep(rows[1])) || (r === 2 && isSep(rows[1]))) tableHtml += '<tbody>';
        tableHtml += '<tr>' + cells(rows[r]).map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>';
        if (r === 0) tableHtml += '</thead>';
      }
      tableHtml += '</tbody></table>';
      html.push(tableHtml);
      continue;
    }

    if (/^(\d+)\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\d+)\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      html.push('<ol>' + items.map(t => `<li>${inline(t)}</li>`).join('') + '</ol>');
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      html.push('<ul>' + items.map(t => `<li>${inline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    if (/^!\[/.test(line)) { i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s/.test(lines[i]) && !/^\|/.test(lines[i]) && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return html.join('');
}
