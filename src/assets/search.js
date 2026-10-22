// Клиентский поиск по статическому индексу assets/search-index.json.
// Ничего не сохраняет: запрос живёт только в адресной строке (?q=...).
(function () {
  'use strict';

  var form = document.getElementById('search-form');
  var input = document.getElementById('q');
  var statusEl = document.getElementById('search-status');
  var list = document.getElementById('search-results');
  if (!form || !input || !list) return;

  var KIND_LABEL = { topic: 'Тема', theory: 'Теория', task: 'Задача', question: 'Вопрос' };
  var index = null;

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function highlight(text, terms) {
    var html = escapeHtml(text);
    terms.forEach(function (t) {
      if (t.length < 2) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      html = html.replace(re, '<mark>$1</mark>');
    });
    return html;
  }

  function snippet(text, terms) {
    if (!text) return '';
    var low = norm(text);
    var pos = -1;
    for (var i = 0; i < terms.length && pos < 0; i++) pos = low.indexOf(terms[i]);
    var start = Math.max(0, pos - 60);
    var cut = text.slice(start, start + 220);
    return (start > 0 ? '… ' : '') + cut + (start + 220 < text.length ? ' …' : '');
  }

  function selectedKinds() {
    var boxes = form.querySelectorAll('input[name="t"]');
    var kinds = {};
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) kinds[boxes[i].value] = true;
    return kinds;
  }

  function run() {
    var query = norm(input.value).trim();
    list.innerHTML = '';
    if (!query) {
      statusEl.textContent = 'Введите запрос.';
      return;
    }
    if (!index) {
      statusEl.textContent = 'Загрузка индекса…';
      return;
    }
    var terms = query.split(/\s+/).filter(Boolean);
    var kinds = selectedKinds();
    var results = [];
    index.forEach(function (e) {
      if (!kinds[e.k]) return;
      var title = norm(e.title);
      var hay = title + ' ' + norm(e.text) + ' ' + norm(e.topic);
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) < 0) return;
        if (title.indexOf(terms[i]) >= 0) score += 3;
        else score += 1;
      }
      if (title.indexOf(query) >= 0) score += 5;
      if (e.k === 'topic') score += 1;
      results.push({ e: e, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });

    statusEl.textContent = results.length
      ? 'Найдено: ' + results.length + (results.length > 100 ? ' (показаны первые 100)' : '')
      : 'Ничего не найдено. Попробуйте другое слово или более короткий запрос.';

    var html = '';
    results.slice(0, 100).forEach(function (r) {
      var e = r.e;
      html += '<li class="search-result">' +
        '<span class="badge badge-kind-' + e.k + '">' + KIND_LABEL[e.k] + '</span> ' +
        '<a href="' + escapeHtml(e.url) + '">' + highlight(e.title, terms) + '</a>' +
        '<span class="muted"> · ' + escapeHtml(e.topic) + '</span>' +
        (e.text ? '<p>' + highlight(snippet(e.text, terms), terms) + '</p>' : '') +
        '</li>';
    });
    list.innerHTML = html;
  }

  var params = new URLSearchParams(window.location.search);
  input.value = params.get('q') || '';
  var header = document.getElementById('header-q');
  if (header) header.value = input.value;

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
  form.addEventListener('change', run);
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var u = new URL(window.location.href);
    u.searchParams.set('q', input.value);
    window.history.replaceState(null, '', u);
    run();
  });

  fetch('assets/search-index.json')
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      index = data;
      run();
      if (!input.value) input.focus();
    })
    .catch(function () {
      statusEl.textContent = 'Не удалось загрузить поисковый индекс. Обновите страницу.';
    });
})();
