// Мини-разметка для учебного контента (подмножество Markdown).
// Поддерживается:
//   абзацы (разделяются пустой строкой), заголовки "### ", "#### ",
//   списки "- " и "1. ", цитаты-врезки "> ", таблицы "| a | b |",
//   блоки кода ```sql ... ```, инлайн `код`, **жирный**, *курсив*,
//   ссылки [текст](адрес). Адрес вида "topic:<id>#<раздел>" или
//   "tasks:<id>#<задача>" превращается во внутреннюю ссылку сайта.

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SQL_KEYWORDS = new Set(`
  select from where group by having order limit offset join inner left right full outer cross on using
  as and or not in is null exists any all union intersect except distinct case when then else end
  insert into values update set delete returning create table view materialized index unique primary
  key foreign references check default constraint alter add drop column type generated always identity
  with recursive over partition window filter asc desc nulls first last lateral true false between like
  ilike begin commit rollback merge matched conflict do nothing excluded cascade restrict no action
  trigger function returns language execute procedure each row before after for if raise exception
  deferrable initially deferred enum domain sequence refresh explain analyze truncate schema natural
  interval date timestamp timestamptz text integer int bigint smallint numeric boolean varchar char
  serial bigserial uuid jsonb real double precision overriding system value of local option temporary
`.trim().split(/\s+/));

// Простая подсветка SQL: комментарии, строки, ключевые слова, числа.
export function highlightSql(code) {
  const tokenRe = /(--[^\n]*)|('(?:[^']|'')*')|(\b[A-Za-z_][A-Za-z_0-9]*\b)|(\b\d+(?:\.\d+)?\b)/g;
  let out = '';
  let last = 0;
  for (const m of code.matchAll(tokenRe)) {
    out += escapeHtml(code.slice(last, m.index));
    const [tok, comment, str, word, num] = m;
    if (comment) out += `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    else if (str) out += `<span class="tok-string">${escapeHtml(str)}</span>`;
    else if (word && SQL_KEYWORDS.has(word.toLowerCase())) out += `<span class="tok-kw">${escapeHtml(word)}</span>`;
    else if (num) out += `<span class="tok-num">${escapeHtml(num)}</span>`;
    else out += escapeHtml(tok);
    last = m.index + tok.length;
  }
  return out + escapeHtml(code.slice(last));
}

export function renderCode(code, lang = '') {
  const body = lang === 'sql' ? highlightSql(code) : escapeHtml(code);
  const label = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
  return `<pre class="code"${label} tabindex="0"><code>${body}</code></pre>`;
}

// resolveLink(href) -> href; позволяет шаблонам подставлять относительные пути.
export function renderInline(text, resolveLink = (h) => h) {
  // Инлайн-код заменяем плейсхолдерами, чтобы внутри него не работала остальная
  // разметка, но жирный/курсив могли охватывать код целиком.
  const codes = [];
  let s = escapeHtml(text.replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const url = resolveLink(href.replace(/&amp;/g, '&'));
    const external = /^https?:/.test(url);
    return `<a href="${escapeHtml(url)}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>');
  // Курсив: *слово…* — открывающая звёздочка перед буквой/цифрой, закрывающая перед
  // пробелом или знаком препинания; так не задеваются (0, *) и count(*).
  s = s.replace(/(^|[\s(«—])\*([\p{L}\p{N}][^*]*?)\*(?=$|[\s.,;:!?)»—])/gu, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
}

function renderTable(lines, inline) {
  const rows = lines.map((l) =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()),
  );
  const isSep = (r) => r.every((c) => /^:?-{2,}:?$/.test(c));
  let head = null;
  let body = rows;
  if (rows.length > 1 && isSep(rows[1])) {
    head = rows[0];
    body = rows.slice(2);
  }
  const th = head ? `<thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead>` : '';
  const tb = body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap" tabindex="0"><table>${th}<tbody>${tb}</tbody></table></div>`;
}

export function renderMarkup(src, resolveLink) {
  const inline = (t) => renderInline(t, resolveLink);
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  const isBlockStart = (l) =>
    /^```/.test(l) || /^#{3,4} /.test(l) || /^\s*[-*] /.test(l) || /^\s*\d+\. /.test(l) || /^> ?/.test(l) || /^\|/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      html.push(renderCode(buf.join('\n'), fence[1]));
      continue;
    }

    const h = line.match(/^(#{3,4}) (.*)$/);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\|/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\|/.test(lines[i])) buf.push(lines[i++]);
      html.push(renderTable(buf, inline));
      continue;
    }

    if (/^> ?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^> ?/.test(lines[i])) buf.push(lines[i++].replace(/^> ?/, ''));
      html.push(`<div class="callout">${renderMarkup(buf.join('\n'), resolveLink)}</div>`);
      continue;
    }

    const ul = /^\s*[-*] /;
    const ol = /^\s*\d+\. /;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items = [];
      while (i < lines.length && (re.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (re.test(lines[i])) items.push(lines[i].replace(re, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++]);
    html.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return html.join('\n');
}

// Плоский текст для поискового индекса.
export function toPlainText(src) {
  return String(src)
    .replace(/```\w*\n?/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
