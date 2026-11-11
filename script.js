/* ============================================================
   НАСТРОЙКИ МАСТЕРА — меняйте только эти строки
   ============================================================ */
const MASTER = {
  name:      'nika_nails',           // имя или ник для шапки и подвала
  city:      'Краснодар',            // город и, если нужно, адрес/район
  hours:     'ежедневно 10:00–20:00',
  whatsapp:  '79182199430',        // телефон в формате 7XXXXXXXXXX (без +)
  telegram:  'sweqtfk',            // личный ник в Telegram без @
  bot:       '',                     // ник бота записи без @ — заполните после создания (см. README)
  instagram: '',                     // ник в Instagram, если появится
};

/* Оттенки, которые лежат в «пробниках» на первом экране        */
const SHADES = [
  { label: 'Вишня',   color: '#E5196F', text: '#FFFFFF', deep: '#B31259' },
  { label: 'Коралл',  color: '#FF4D24', text: '#2A0E22', deep: '#C03410' },
  { label: 'Лаванда', color: '#8B5CF6', text: '#FFFFFF', deep: '#6538D6' },
  { label: 'Лайм',    color: '#A4D62E', text: '#2A0E22', deep: '#5D7D06' },
  { label: 'Сапфир',  color: '#2D50E6', text: '#FFFFFF', deep: '#1F3AAE' },
];

/* Услуги для формы записи                                      */
const SERVICES = [
  'Маникюр аппаратный, без покрытия',
  'Маникюр + гель-лак',
  'Маникюр + укрепление ногтей',
  'Маникюр + френч',
  'Маникюр + втирка / слайдеры / стразы',
  'Снятие покрытия',
  'Педикюр + покрытие',
];

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];
/* ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* --- подстановка данных мастера в текст и ссылки --- */
$$('[data-master-name]').forEach(el => el.textContent = MASTER.name);
$$('[data-master-city]').forEach(el => el.textContent = MASTER.city);
$$('[data-master-hours]').forEach(el => el.textContent = MASTER.hours);
$$('[data-link-tg]').forEach(a => a.href = `https://t.me/${MASTER.telegram}`);
$$('[data-link-wa]').forEach(a => a.href = `https://wa.me/${MASTER.whatsapp}`);
$$('[data-link-insta]').forEach(a => {
  if (MASTER.instagram) a.href = `https://instagram.com/${MASTER.instagram}`;
  else a.remove(); // нет инстаграмма — нет ссылки
});
document.title = `${MASTER.name} — маникюр, запись онлайн`;

/* --- бегущая строка --- */
{
  const words = ['гель-лак', 'камуфляж', 'укрепление', 'френч', 'втирка', 'стразы', 'слайдеры', 'объёмный дизайн', 'педикюр', 'ремонт ногтя'];
  const chunk = words.map(w => `<span>${w}</span><b class="star">✦</b>`).join('');
  $('#ticker-track').innerHTML = chunk + chunk; // два одинаковых куска для бесшовного круга
}

/* --- пробники оттенков --- */
function applyShade(shade) {
  const root = document.documentElement.style;
  root.setProperty('--accent', shade.color);
  root.setProperty('--accent-contrast', shade.text);
  root.setProperty('--accent-text', shade.deep);
  root.setProperty('--accent-soft', shade.color + '33');
  try { localStorage.setItem('shade', shade.color); } catch (e) { /* приватный режим */ }
}
{
  const box = $('#swatch-chips');
  const saved = (() => { try { return localStorage.getItem('shade'); } catch (e) { return null; } })();
  SHADES.forEach(shade => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.background = shade.color;
    b.title = shade.label;
    b.setAttribute('aria-label', `Оттенок ${shade.label}`);
    b.setAttribute('aria-pressed', String(shade.color === saved));
    if (shade.color === saved || (!saved && shade.label === 'Вишня')) {
      applyShade(shade);
      if (!saved) b.setAttribute('aria-pressed', 'true');
    }
    b.addEventListener('click', () => {
      applyShade(shade);
      $$('.chip', box).forEach(c => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
    });
    box.append(b);
  });
}

/* --- форма записи --- */
{
  const sel = $('#f-service');
  SERVICES.forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    sel.append(o);
  });
  const time = $('#f-time');
  TIME_SLOTS.forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    time.append(o);
  });

  /* границы дат — по местному времени, а не по UTC (иначе вечером «сегодня»
     внезапно становится «завтра»), и не дальше 60 дней вперёд */
  const date = $('#f-date');
  const pad2 = n => String(n).padStart(2, '0');
  const isoLocal = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  date.min = isoLocal(new Date());
  const horizon = new Date(); horizon.setDate(horizon.getDate() + 60);
  date.max = isoLocal(horizon);

  const form = $('#booking-form');
  const el = form.elements;
  const status = $('#form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const waRadio = form.querySelector('input[name="channel"][value="wa"]');
  const tgRadio  = form.querySelector('input[name="channel"][value="tg"]');
  const contactInput = $('#f-contact');
  const contactField = contactInput.closest('.field');
  const contactLabel = contactField.querySelector('label');

  /* в WhatsApp мастер видит номер в самом чате — поле контакта не нужно */
  function syncChannel() {
    contactField.hidden = waRadio.checked;
  }
  [waRadio, tgRadio].forEach(r => r.addEventListener('change', syncChannel));

  /* --- черновик: если вкладку случайно закрыли — форма не обнуляется --- */
  const DRAFT_KEY = 'booking-draft';
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        name: el.name.value, contact: el.contact.value,
        service: el.service.value, date: el.date.value,
        time: el.time.value, channel: form.elements.channel.value,
      }));
    } catch (e) { /* приватный режим */ }
  }
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);
  (function restoreDraft() {
    let d; try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { return; }
    if (!d) return;
    if (d.name) el.name.value = d.name;
    if (d.contact) el.contact.value = d.contact;
    if (d.service && SERVICES.includes(d.service)) el.service.value = d.service;
    if (d.date && d.date >= date.min && d.date <= date.max) el.date.value = d.date;
    if (d.time && TIME_SLOTS.includes(d.time)) el.time.value = d.time;
    if (d.channel === 'tg') tgRadio.checked = true;
    syncChannel();
  })();
  syncChannel(); // стартовое состояние: по умолчанию WhatsApp — контакт не нужен

  /* копирование с запасным вариантом: clipboard API требует защищённый
     контекст — на http или в старых браузерах ловим execCommand */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
        document.body.append(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) { return false; }
    }
  }

  /* клик по настоящей ссылке надёжнее window.open:
     срабатывает жестом пользователя и не глушится блокировщиками попапов */
  function openMessenger(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  }

  function clearExtra() {
    $$('.copy-box, .status-extra', form).forEach(n => n.remove());
  }
  function addResendLink(text, url) {
    const p = document.createElement('p');
    p.className = 'status-extra';
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = text;
    p.append(a);
    status.after(p);
  }
  function showManualCopy(msg) {
    const box = document.createElement('div');
    box.className = 'copy-box';
    const ta = document.createElement('textarea');
    ta.readOnly = true; ta.rows = 7; ta.value = msg;
    ta.addEventListener('focus', () => ta.select());
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = 'Скопировать текст';
    btn.addEventListener('click', async () => {
      const ok = await copyText(msg);
      btn.textContent = ok ? 'Скопировано ✓' : 'Выделите текст выше и нажмите Ctrl+C';
    });
    box.append(ta, btn);
    status.after(box);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.classList.remove('err');
    clearExtra();

    const name = el.name.value.trim();
    const contact = el.contact.value.trim();
    const service = el.service.value;
    const when = el.date.value ? el.date.value.split('-').reverse().join('.') : '';
    const timeVal = el.time.value;

    if (!name || !when) {
      status.textContent = 'Осталось заполнить имя и дату — без них не понятно, кто и когда.';
      status.classList.add('err');
      return;
    }

    const msg =
      `Здравствуйте! Хочу записаться на маникюр.\n` +
      `Имя: ${name}\n` +
      (contact ? `Связь: ${contact}\n` : '') +
      `Услуга: ${service}\n` +
      `Когда: ${when}, около ${timeVal}`;

    const isWa = waRadio.checked;
    submitBtn.disabled = true;
    submitBtn.textContent = isWa ? 'Открываю WhatsApp…' : 'Открываю Telegram…';
    try {
      if (isWa) {
        const url = `https://wa.me/${MASTER.whatsapp}?text=${encodeURIComponent(msg)}`;
        openMessenger(url);
        status.textContent = 'Открыли WhatsApp — текст заявки уже вставлен, просто нажмите «отправить».';
        addResendLink('Чат не открылся? Нажмите ещё раз', url);
      } else {
        const url = `https://t.me/${MASTER.telegram}`;
        const copied = await copyText(msg);
        openMessenger(url);
        if (copied) {
          status.textContent = 'Открыли Telegram — текст заявки уже в буфере. Вставьте его в чат и отправьте.';
        } else {
          status.textContent = 'Открыли Telegram. Автокопирование не сработало — скопируйте текст заявки вручную:';
          showManualCopy(msg);
        }
        addResendLink('Чат не открылся? Нажмите ещё раз', url);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });
}

$('#year').textContent = new Date().getFullYear();
