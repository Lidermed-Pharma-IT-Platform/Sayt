/**
 * Сервер Lidermed IT Platform — страницы, контент, портфолио, новости, заявки, настройки, роли.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PAGES_FILE = path.join(DATA_DIR, 'pages.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const SALT = 'pharmait_salt_v1';
const sessions = new Map();

function hashPassword(pass) {
  return crypto.createHash('sha256').update(SALT + (pass || '')).digest('hex');
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');

  const defaultSettings = {
    phone: '+998933921161',
    email: 'samandarsaidjanov@gmail.com',
    address: 'Doʻmbirobod 4-tor koʻchasi, 23/2',
    notificationEmail: '',
    social: { telegram: '', whatsapp: '', instagram: '' },
    meta: { defaultTitle: 'Lidermed IT Platform', defaultDescription: 'IT-решения для фармацевтической отрасли — Узбекистан' },
    seo: {},
    smtp: {}
  };
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf8');
  }

  if (!fs.existsSync(PAGES_FILE)) {
    const pages = {
      services: { id: 'services', title: 'Услуги', slug: 'services', metaDescription: '', content: '', menuOrder: 3, visible: true },
      industry: { id: 'industry', title: 'Отрасль', slug: 'industry', metaDescription: '', content: '', menuOrder: 4, visible: true },
      technologies: { id: 'technologies', title: 'Технологии', slug: 'technologies', metaDescription: '', content: '', menuOrder: 6, visible: true },
      contacts: { id: 'contacts', title: 'Контакты', slug: 'contacts', metaDescription: '', content: '', menuOrder: 7, visible: true }
    };
    fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), 'utf8');
  }

  if (!fs.existsSync(CONTENT_FILE)) {
    const content = {
      heroTitle: 'Цифровые решения для фармацевтических компаний',
      heroLead: 'Мы создаём специализированные IT-системы для фармацевтического рынка: аналитика продаж, CRM для медицинских представителей, система обучения и HR-инструменты. Наши решения помогают фармкомпаниям автоматизировать ключевые процессы и принимать решения на основе данных.',
      benefits: [
        { title: 'Отраслевая экспертиза', text: 'Глубокое понимание процессов фармпроизводства, GxP и требований регуляторов.' },
        { title: 'Надёжные решения', text: 'Валидация, документирование и поддержка систем.' },
        { title: 'Современный стек', text: 'Актуальные технологии, интеграции с ERP/MES.' }
      ],
      stats: [
        { num: '10+', label: 'лет на рынке' },
        { num: '50+', label: 'реализованных проектов' },
        { num: '20+', label: 'фармкомпаний' },
        { num: 'GxP', label: 'соответствие' }
      ],
      services: [
        { id: 'srv-1', title: 'CRM', description: 'Управление взаимоотношениями с клиентами, учёт обращений и полная картина по контактам для фармкомпаний.' },
        { id: 'srv-2', title: 'Автоматизационный процесс для детализации и аналитики', description: 'Автоматизация процессов, детализированная отчётность и аналитика для принятия решений.' },
        { id: 'srv-3', title: 'Специальное для вас', description: 'Индивидуальные решения под ваши задачи: от доработки систем до разработки под ключ.' }
      ]
    };
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
  }

  if (!fs.existsSync(CASES_FILE)) fs.writeFileSync(CASES_FILE, '[]', 'utf8');
  if (!fs.existsSync(NEWS_FILE)) fs.writeFileSync(NEWS_FILE, '[]', 'utf8');
  if (!fs.existsSync(USERS_FILE)) {
    const users = [{ id: '1', login: 'admin', passwordHash: hashPassword('admin123'), role: 'admin' }];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } else {
    try {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (!Array.isArray(users) || users.length === 0) {
        const def = [{ id: '1', login: 'admin', passwordHash: hashPassword('admin123'), role: 'admin' }];
        fs.writeFileSync(USERS_FILE, JSON.stringify(def, null, 2), 'utf8');
      }
    } catch (e) {
      const users = [{ id: '1', login: 'admin', passwordHash: hashPassword('admin123'), role: 'admin' }];
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    }
  }
}

ensureDataFiles();

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: '5mb' }));

['contacts', 'services', 'privacy'].forEach(function (name) {
  app.get('/' + name, function (req, res) {
    res.sendFile(path.join(__dirname, name + '.html'));
  });
});

app.use(express.static(path.join(__dirname)));

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.body && req.body.token) || (req.query && req.query.token);
  const session = token ? sessions.get(token) : null;
  if (!session) return res.status(401).json({ message: 'Требуется авторизация' });
  req.user = session;
  req.token = token;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Доступ запрещён' });
  next();
}

app.post('/api/lead', function (req, res) {
  const { name, email, phone, type, message } = req.body || {};
  if (!name || !phone) return res.status(400).json({ message: 'Укажите имя и телефон.' });
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name, email: email || '', phone: phone || '', type: type || 'consult', message: message || '',
    createdAt: new Date().toISOString()
  };
  leads.push(lead);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    if (settings.notificationEmail && settings.smtp && settings.smtp.host) {
      try {
        const nodemailer = require('nodemailer');
        const transport = nodemailer.createTransport(settings.smtp);
        transport.sendMail({
          to: settings.notificationEmail,
          subject: 'Новая заявка с сайта Lidermed IT Platform',
          text: `Имя: ${name}\nEmail: ${email || '—'}\nТелефон: ${phone || '—'}\nТип: ${type || '—'}\nСообщение: ${message || '—'}`
        }).catch(() => {});
      } catch (e) {}
    }
  } catch (e) {}
  res.status(201).json({ ok: true, id: lead.id });
});

app.get('/api/public/settings', function (req, res) {
  try { res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))); } catch (e) { res.json({}); }
});
app.get('/api/public/content', function (req, res) {
  try { res.json(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'))); } catch (e) { res.json({}); }
});
app.get('/api/public/pages', function (req, res) {
  try { res.json(JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'))); } catch (e) { res.json({}); }
});
app.get('/api/public/cases', function (req, res) {
  try {
    const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8')).filter(c => c.published);
    res.json(cases.sort((a, b) => (a.order || 0) - (b.order || 0)));
  } catch (e) { res.json([]); }
});
app.get('/api/public/news', function (req, res) {
  try {
    const news = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8')).filter(n => n.published);
    res.json(news.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.json([]); }
});

app.post('/api/login', function (req, res) {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ message: 'Укажите логин и пароль' });
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.login === login && u.passwordHash === hashPassword(password));
  if (!user) return res.status(401).json({ message: 'Неверный логин или пароль' });
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId: user.id, login: user.login, role: user.role });
  res.json({ token, user: { login: user.login, role: user.role } });
});

app.post('/api/logout', function (req, res) {
  const token = (req.body && req.body.token) || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, function (req, res) {
  res.json({ user: req.user });
});

app.get('/api/leads', requireAuth, function (req, res) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    res.json(leads.reverse());
  } catch (e) { res.json([]); }
});

app.get('/api/leads/export', requireAuth, function (req, res) {
  const format = (req.query.format || 'csv').toLowerCase();
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    if (format === 'csv') {
      const header = 'Дата;Имя;Email;Телефон;Тип;Сообщение\n';
      const rows = leads.map(l => {
        const d = (l.createdAt || '').replace(/T/g, ' ').replace(/\..*/, '');
        const msg = (l.message || '').replace(/"/g, '""').replace(/\n/g, ' ');
        return `${d};"${(l.name || '').replace(/"/g, '""')}";"${(l.email || '').replace(/"/g, '""')}";"${(l.phone || '').replace(/"/g, '""')}";"${(l.type || '').replace(/"/g, '""')}";"${msg}"`;
      }).reverse();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      res.send('\uFEFF' + header + rows.join('\n'));
      return;
    }
    res.json(leads);
  } catch (e) { res.status(500).json({ message: 'Ошибка экспорта' }); }
});

app.get('/api/pages', requireAuth, function (req, res) {
  try {
    const pages = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'));
    res.json(typeof pages === 'object' && !Array.isArray(pages) ? Object.values(pages).sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0)) : pages);
  } catch (e) { res.json([]); }
});

app.get('/api/pages/:id', requireAuth, function (req, res) {
  try {
    const pages = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'));
    const page = pages[req.params.id] || (Array.isArray(pages) ? pages.find(p => p.id === req.params.id) : null);
    if (!page) return res.status(404).json({ message: 'Страница не найдена' });
    res.json(page);
  } catch (e) { res.status(500).json({}); }
});

app.put('/api/pages/:id', requireAuth, function (req, res) {
  let pages = {};
  try { pages = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8')); } catch (e) {}
  if (typeof pages !== 'object' || Array.isArray(pages)) pages = {};
  const id = req.params.id;
  const data = req.body || {};
  const existing = pages[id] || { id, title: id, slug: id, metaDescription: '', content: '', menuOrder: 99, visible: true };
  pages[id] = { ...existing, ...data, id };
  fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), 'utf8');
  res.json(pages[id]);
});

app.get('/api/content', requireAuth, function (req, res) {
  try { res.json(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'))); } catch (e) { res.json({}); }
});

app.put('/api/content', requireAuth, function (req, res) {
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); } catch (e) {}
  const data = { ...existing, ...req.body };
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json(data);
});

app.get('/api/cases', requireAuth, function (req, res) {
  try {
    let list = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
    if (!Array.isArray(list)) list = [];
    res.json(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
  } catch (e) { res.json([]); }
});

app.post('/api/cases', requireAuth, function (req, res) {
  const list = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  const id = 'case-' + Date.now();
  const item = { id, slug: id, title: '', task: '', solution: '', result: '', published: false, order: list.length, createdAt: new Date().toISOString(), ...req.body };
  list.push(item);
  fs.writeFileSync(CASES_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.status(201).json(item);
});

app.get('/api/cases/:id', requireAuth, function (req, res) {
  const list = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  const item = list.find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Не найдено' });
  res.json(item);
});

app.put('/api/cases/:id', requireAuth, function (req, res) {
  let list = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  const idx = list.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Не найдено' });
  list[idx] = { ...list[idx], ...req.body };
  fs.writeFileSync(CASES_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json(list[idx]);
});

app.patch('/api/cases/:id/publish', requireAuth, function (req, res) {
  let list = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  const idx = list.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Не найдено' });
  list[idx].published = req.body.published !== false;
  fs.writeFileSync(CASES_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json(list[idx]);
});

app.delete('/api/cases/:id', requireAuth, function (req, res) {
  let list = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));
  list = list.filter(c => c.id !== req.params.id);
  fs.writeFileSync(CASES_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json({ ok: true });
});

app.get('/api/news', requireAuth, function (req, res) {
  try {
    let list = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
    if (!Array.isArray(list)) list = [];
    res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.json([]); }
});

app.post('/api/news', requireAuth, function (req, res) {
  const list = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  const id = 'news-' + Date.now();
  const item = { id, slug: id, title: '', excerpt: '', body: '', published: false, createdAt: new Date().toISOString(), ...req.body };
  list.push(item);
  fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.status(201).json(item);
});

app.get('/api/news/:id', requireAuth, function (req, res) {
  const list = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  const item = list.find(n => n.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Не найдено' });
  res.json(item);
});

app.put('/api/news/:id', requireAuth, function (req, res) {
  let list = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  const idx = list.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Не найдено' });
  list[idx] = { ...list[idx], ...req.body };
  fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json(list[idx]);
});

app.patch('/api/news/:id/publish', requireAuth, function (req, res) {
  let list = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  const idx = list.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Не найдено' });
  list[idx].published = req.body.published !== false;
  fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json(list[idx]);
});

app.delete('/api/news/:id', requireAuth, function (req, res) {
  let list = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  list = list.filter(n => n.id !== req.params.id);
  fs.writeFileSync(NEWS_FILE, JSON.stringify(list, null, 2), 'utf8');
  res.json({ ok: true });
});

app.get('/api/settings', requireAuth, function (req, res) {
  try { res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))); } catch (e) { res.json({}); }
});

app.put('/api/settings', requireAuth, function (req, res) {
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch (e) {}
  const body = req.body || {};
  settings = { ...settings, ...body };
  if (body.smtp && typeof body.smtp === 'object') {
    settings.smtp = { ...(settings.smtp || {}), ...body.smtp };
    if (body.smtp.pass === undefined || body.smtp.pass === '') delete settings.smtp.pass;
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  res.json(settings);
});

app.get('/api/users', requireAuth, requireAdmin, function (req, res) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    res.json(users.map(u => ({ id: u.id, login: u.login, role: u.role })));
  } catch (e) { res.json([]); }
});

app.post('/api/users', requireAuth, requireAdmin, function (req, res) {
  const { login, password, role } = req.body || {};
  if (!login || !password) return res.status(400).json({ message: 'Укажите логин и пароль' });
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  if (users.some(u => u.login === login)) return res.status(400).json({ message: 'Такой логин уже есть' });
  const id = String(Date.now());
  users.push({ id, login, passwordHash: hashPassword(password), role: role || 'editor' });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  res.status(201).json({ id, login, role: role || 'editor' });
});

app.put('/api/users/:id/password', requireAuth, requireAdmin, function (req, res) {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ message: 'Укажите пароль' });
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ message: 'Пользователь не найден' });
  u.passwordHash = hashPassword(password);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, function (req, res) {
  if (req.params.id === req.user.userId) return res.status(400).json({ message: 'Нельзя удалить себя' });
  let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  users = users.filter(u => u.id !== req.params.id);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  res.json({ ok: true });
});

app.get('/admin', function (req, res) {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.listen(PORT, function () {
  console.log('Lidermed IT Platform: http://localhost:' + PORT);
  console.log('Админ: http://localhost:' + PORT + '/admin (логин: admin, пароль: admin123)');
});
