(function () {
  'use strict';
  var API = '/api';
  var token = localStorage.getItem('adminToken');
  var currentUser = null;
  var currentTab = 'leads';

  function aT(key) {
    var i = window.i18n;
    if (!i || !i.t) return key;
    var L = i.t[i.getLang()];
    return (L && L[key] !== undefined) ? L[key] : key;
  }

  function headers() {
    var h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  function fetchApi(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || headers();
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { logout(); return Promise.reject(new Error(aT('a_authRequired'))); }
      return r;
    });
  }

  var sidebarEl = document.getElementById('adminSidebar');
  var sidebarOverlay = document.getElementById('sidebarOverlay');
  var sidebarToggle = document.getElementById('sidebarToggle');

  function closeSidebar() {
    if (sidebarEl) sidebarEl.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
  }
  function openSidebar() {
    if (sidebarEl) sidebarEl.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
  }
  if (sidebarToggle) sidebarToggle.addEventListener('click', function () {
    sidebarEl && sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('adminWrap').style.display = 'none';
  }

  function showAdmin() {
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('adminWrap').style.display = 'block';
    if (currentUser && currentUser.role === 'admin') document.getElementById('usersTab').style.display = 'block';
    showTab('leads');
  }

  function logout() {
    token = null;
    localStorage.removeItem('adminToken');
    fetchApi(API + '/logout', { method: 'POST' }).catch(function () {});
    showLogin();
  }

  function showTab(name) {
    currentTab = name;
    closeSidebar();
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.admin-sidebar a[data-tab]').forEach(function (a) {
      if (a.getAttribute('data-tab') === name) {
        a.classList.add('active-tab');
        a.style.fontWeight = 'bold';
      } else {
        a.classList.remove('active-tab');
        a.style.fontWeight = '';
      }
    });
    var panel = document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1));
    if (panel) panel.classList.add('active');
    if (name === 'leads') loadLeads();
    if (name === 'pages') loadPages();
    if (name === 'content') loadContent();
    if (name === 'cases') loadCases();
    if (name === 'news') loadNews();
    if (name === 'settings') loadSettings();
    if (name === 'users') loadUsers();
  }

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var login = document.getElementById('loginName').value;
    var password = document.getElementById('loginPass').value;
    document.getElementById('loginError').textContent = '';
    fetchApi(API + '/login', { method: 'POST', body: JSON.stringify({ login: login, password: password }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.token) {
          token = data.token;
          currentUser = data.user;
          localStorage.setItem('adminToken', token);
          showAdmin();
        } else throw new Error(data.message || aT('a_loginError'));
      })
      .catch(function (err) {
        document.getElementById('loginError').textContent = err.message || aT('a_loginError');
      });
  });

  document.getElementById('logoutBtn').addEventListener('click', function (e) { e.preventDefault(); logout(); });

  document.querySelectorAll('.admin-sidebar a[data-tab]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showTab(this.getAttribute('data-tab'));
    });
  });

  document.addEventListener('langChange', function () {
    if (currentTab) showTab(currentTab);
  });

  function escapeHtml(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function loadLeads() {
    var el = document.getElementById('leadsList');
    el.innerHTML = aT('a_loading');
    fetchApi(API + '/leads').then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.length === 0) { el.innerHTML = '<p class="section-subtitle">' + aT('a_noLeads') + '</p>'; return; }
        var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>' + aT('a_date') + '</th><th>' + aT('a_name') + '</th><th>' + aT('a_email') + '</th><th>' + aT('a_phone') + '</th><th>' + aT('a_type') + '</th><th>' + aT('a_message') + '</th></tr></thead><tbody>';
        data.forEach(function (l) {
          var d = l.createdAt ? new Date(l.createdAt).toLocaleString('ru') : '—';
          html += '<tr><td>' + escapeHtml(d) + '</td><td>' + escapeHtml(l.name) + '</td><td>' + escapeHtml(l.email) + '</td><td>' + escapeHtml(l.phone || '—') + '</td><td>' + escapeHtml(l.type || '—') + '</td><td>' + escapeHtml((l.message || '').slice(0, 100)) + (l.message && l.message.length > 100 ? '…' : '') + '</td></tr>';
        });
        html += '</tbody></table></div>';
        el.innerHTML = html;
      })
      .catch(function () { el.innerHTML = '<p class="section-subtitle">' + aT('a_loadError') + '</p>'; });
  }

  document.getElementById('exportCsv').addEventListener('click', function (e) {
    e.preventDefault();
    fetchApi(API + '/leads/export?format=csv').then(function (r) { return r.text(); })
      .then(function (text) {
        var a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
        a.download = 'leads.csv';
        a.click();
      })
      .catch(function () { alert(aT('a_exportError')); });
  });

  // ——— Страницы ———
  function loadPages() {
    var el = document.getElementById('pagesList');
    el.innerHTML = aT('a_loading');
    fetchApi(API + '/pages').then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.length === 0) { el.innerHTML = '<p>' + aT('a_noPages') + '</p>'; return; }
        var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>' + aT('a_page') + '</th><th>' + aT('a_visibility') + '</th><th>' + aT('a_order') + '</th><th></th></tr></thead><tbody>';
        data.forEach(function (p) {
          html += '<tr><td>' + escapeHtml(p.title || p.id) + '</td><td>' + (p.visible ? aT('a_yes') : aT('a_no')) + '</td><td>' + (p.menuOrder || 0) + '</td><td><button type="button" class="btn btn-outline btn-page-edit" data-id="' + escapeHtml(p.id) + '">' + aT('a_edit') + '</button></td></tr>';
        });
        html += '</tbody></table></div>';
        el.innerHTML = html;
        el.querySelectorAll('.btn-page-edit').forEach(function (btn) {
          btn.addEventListener('click', function () { editPage(this.getAttribute('data-id')); });
        });
      })
      .catch(function () { el.innerHTML = '<p>' + aT('a_loadError') + '</p>'; });
  }

  function editPage(id) {
    fetchApi(API + '/pages/' + id).then(function (r) { return r.json(); })
      .then(function (p) {
        document.getElementById('pageId').value = p.id;
        document.getElementById('pageTitle').value = p.title || '';
        document.getElementById('pageMetaDesc').value = p.metaDescription || '';
        document.getElementById('pageContent').value = p.content || '';
        document.getElementById('pageVisible').checked = p.visible !== false;
        document.getElementById('pageMenuOrder').value = p.menuOrder != null ? p.menuOrder : 0;
        document.getElementById('pageEditForm').style.display = 'block';
      });
  }

  document.getElementById('pageForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('pageId').value;
    var payload = {
      title: document.getElementById('pageTitle').value,
      metaDescription: document.getElementById('pageMetaDesc').value,
      content: document.getElementById('pageContent').value,
      visible: document.getElementById('pageVisible').checked,
      menuOrder: parseInt(document.getElementById('pageMenuOrder').value, 10) || 0
    };
    fetchApi(API + '/pages/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function () {
        document.getElementById('pageEditForm').style.display = 'none';
        loadPages();
      })
      .catch(function (err) { alert(err.message || aT('a_error')); });
  });
  document.getElementById('pageFormCancel').addEventListener('click', function () {
    document.getElementById('pageEditForm').style.display = 'none';
  });

  // ——— Контент главной ———
  function loadContent() {
    fetchApi(API + '/content').then(function (r) { return r.json(); })
      .then(function (data) {
        document.getElementById('contentHeroTitle').value = data.heroTitle || '';
        document.getElementById('contentHeroLead').value = data.heroLead || '';
        renderBenefits(data.benefits || []);
        renderStats(data.stats || []);
        servicesData = Array.isArray(data.services) && data.services.length ? data.services : [
          { id: 'srv-1', title: 'CRM', description: 'Управление взаимоотношениями с клиентами, учёт обращений и полная картина по контактам для фармкомпаний.' },
          { id: 'srv-2', title: 'Автоматизационный процесс для детализации и аналитики', description: 'Автоматизация процессов, детализированная отчётность и аналитика для принятия решений.' },
          { id: 'srv-3', title: 'Специальное для вас', description: 'Индивидуальные решения под ваши задачи: от доработки систем до разработки под ключ.' }
        ];
        renderServices(servicesData);
      });
  }

  var servicesData = [];

  var benefitsData = [];
  var statsData = [];

  function renderBenefits(arr) {
    benefitsData = arr.length ? arr : [{ title: '', text: '' }];
    var wrap = document.getElementById('contentBenefits');
    wrap.innerHTML = benefitsData.map(function (b, i) {
      return '<div class="content-blocks" data-idx="' + i + '"><h4>' + aT('a_benefit') + ' ' + (i + 1) + '</h4><div class="form-group"><label>' + aT('a_title') + '</label><input type="text" class="benefit-title" value="' + escapeHtml(b.title) + '"></div><div class="form-group"><label>' + aT('a_text') + '</label><textarea class="benefit-text" rows="2">' + escapeHtml(b.text) + '</textarea></div><button type="button" class="btn-remove-benefit">' + aT('a_remove') + '</button></div>';
    }).join('');
    wrap.querySelectorAll('.benefit-title').forEach(function (inp, i) {
      inp.addEventListener('input', function () { benefitsData[i].title = this.value; });
    });
    wrap.querySelectorAll('.benefit-text').forEach(function (inp, i) {
      inp.addEventListener('input', function () { benefitsData[i].text = this.value; });
    });
    wrap.querySelectorAll('.btn-remove-benefit').forEach(function (btn, i) {
      btn.addEventListener('click', function () { benefitsData.splice(i, 1); renderBenefits(benefitsData); });
    });
  }

  function renderStats(arr) {
    statsData = arr.length ? arr : [{ num: '', label: '' }];
    var wrap = document.getElementById('contentStats');
    wrap.innerHTML = '<h4>' + aT('a_stats') + '</h4>' + statsData.map(function (s, i) {
      return '<div class="content-blocks" data-idx="' + i + '"><div class="form-group"><label>' + aT('a_number') + '</label><input type="text" class="stat-num" value="' + escapeHtml(s.num) + '"></div><div class="form-group"><label>' + aT('a_label') + '</label><input type="text" class="stat-label" value="' + escapeHtml(s.label) + '"></div><button type="button" class="btn-remove-stat">' + aT('a_remove') + '</button></div>';
    }).join('');
    wrap.querySelectorAll('.stat-num').forEach(function (inp, i) {
      inp.addEventListener('input', function () { statsData[i].num = this.value; });
    });
    wrap.querySelectorAll('.stat-label').forEach(function (inp, i) {
      inp.addEventListener('input', function () { statsData[i].label = this.value; });
    });
    wrap.querySelectorAll('.btn-remove-stat').forEach(function (btn, i) {
      btn.addEventListener('click', function () { statsData.splice(i, 1); renderStats(statsData); });
    });
  }

  document.getElementById('addBenefit').addEventListener('click', function () {
    benefitsData.push({ title: '', text: '' });
    renderBenefits(benefitsData);
  });
  document.getElementById('addStat').addEventListener('click', function () {
    statsData.push({ num: '', label: '' });
    renderStats(statsData);
  });
  document.getElementById('addService').addEventListener('click', function () {
    servicesData.push({ id: 'srv-' + Date.now(), title: '', description: '' });
    renderServices(servicesData);
  });

  function renderServices(arr) {
    servicesData = arr.length ? arr : [];
    var wrap = document.getElementById('contentServices');
    wrap.innerHTML = servicesData.map(function (s, i) {
      return '<div class="content-blocks" data-svc-idx="' + i + '"><h4>' + aT('a_service') + ' ' + (i + 1) + '</h4>' +
        '<div class="form-group"><label>' + aT('a_title') + '</label><input type="text" class="service-title" value="' + escapeHtml(s.title) + '"></div>' +
        '<div class="form-group"><label>' + aT('a_description') + '</label><textarea class="service-description" rows="3">' + escapeHtml(s.description) + '</textarea></div>' +
        '<button type="button" class="btn-remove-service">' + aT('a_remove') + '</button></div>';
    }).join('');
    wrap.querySelectorAll('.service-title').forEach(function (inp, i) {
      inp.addEventListener('input', function () { servicesData[i].title = this.value; });
    });
    wrap.querySelectorAll('.service-description').forEach(function (inp, i) {
      inp.addEventListener('input', function () { servicesData[i].description = this.value; });
    });
    wrap.querySelectorAll('.btn-remove-service').forEach(function (btn, i) {
      btn.addEventListener('click', function () { servicesData.splice(i, 1); renderServices(servicesData); });
    });
  }

  document.getElementById('contentForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var payload = {
      heroTitle: document.getElementById('contentHeroTitle').value,
      heroLead: document.getElementById('contentHeroLead').value,
      benefits: benefitsData.filter(function (b) { return b.title || b.text; }),
      stats: statsData.filter(function (s) { return s.num || s.label; }),
      services: servicesData
    };
    fetchApi(API + '/content', { method: 'PUT', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function () {
        document.getElementById('contentStatus').textContent = 'Сохранено.';
        document.getElementById('contentStatus').className = 'form-status success';
      })
      .catch(function (err) {
        document.getElementById('contentStatus').textContent = err.message || aT('a_error');
        document.getElementById('contentStatus').className = 'form-status error';
      });
  });

  // ——— Кейсы ———
  function loadCases() {
    var el = document.getElementById('casesList');
    el.innerHTML = aT('a_loading');
    fetchApi(API + '/cases').then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.length === 0) { el.innerHTML = '<p>' + aT('a_noCases') + '</p>'; return; }
        var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>' + aT('a_title') + '</th><th>' + aT('a_status') + '</th><th></th></tr></thead><tbody>';
        data.forEach(function (c) {
          html += '<tr><td>' + escapeHtml(c.title || '—') + '</td><td><span class="badge ' + (c.published ? 'badge-published' : 'badge-draft') + '">' + (c.published ? aT('a_published') : aT('a_draft')) + '</span></td><td><div class="row-actions"><button type="button" class="btn btn-outline btn-case-edit" data-id="' + escapeHtml(c.id) + '">' + aT('a_edit') + '</button><button type="button" class="btn btn-outline btn-case-publish" data-id="' + escapeHtml(c.id) + '" data-pub="' + !c.published + '">' + (c.published ? aT('a_unpublish') : aT('a_publish')) + '</button><button type="button" class="btn btn-outline btn-case-del" data-id="' + escapeHtml(c.id) + '">' + aT('a_remove') + '</button></div></td></tr>';
        });
        html += '</tbody></table></div>';
        el.innerHTML = html;
        el.querySelectorAll('.btn-case-edit').forEach(function (b) { b.addEventListener('click', function () { editCase(this.getAttribute('data-id')); }); });
        el.querySelectorAll('.btn-case-publish').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var pub = this.getAttribute('data-pub') === 'true';
            fetchApi(API + '/cases/' + id + '/publish', { method: 'PATCH', body: JSON.stringify({ published: pub }) }).then(function () { loadCases(); });
          });
        });
        el.querySelectorAll('.btn-case-del').forEach(function (b) {
          b.addEventListener('click', function () {
            if (!confirm(aT('a_confirmDeleteCase'))) return;
            fetchApi(API + '/cases/' + this.getAttribute('data-id'), { method: 'DELETE' }).then(function () { loadCases(); document.getElementById('caseFormWrap').style.display = 'none'; });
          });
        });
      })
      .catch(function () { el.innerHTML = '<p>' + aT('a_loadError') + '</p>'; });
  }

  function editCase(id) {
    if (!id) {
      document.getElementById('caseFormTitle').textContent = aT('a_caseNew');
      document.getElementById('caseId').value = '';
      document.getElementById('caseTitle').value = '';
      document.getElementById('caseTask').value = '';
      document.getElementById('caseSolution').value = '';
      document.getElementById('caseResult').value = '';
      document.getElementById('casePublished').checked = false;
      document.getElementById('caseOrder').value = '0';
      document.getElementById('caseFormWrap').style.display = 'block';
      return;
    }
    fetchApi(API + '/cases/' + id).then(function (r) { return r.json(); })
      .then(function (c) {
        document.getElementById('caseFormTitle').textContent = aT('a_caseEdit');
        document.getElementById('caseId').value = c.id;
        document.getElementById('caseTitle').value = c.title || '';
        document.getElementById('caseTask').value = c.task || '';
        document.getElementById('caseSolution').value = c.solution || '';
        document.getElementById('caseResult').value = c.result || '';
        document.getElementById('casePublished').checked = !!c.published;
        document.getElementById('caseOrder').value = c.order != null ? c.order : 0;
        document.getElementById('caseFormWrap').style.display = 'block';
      });
  }

  document.getElementById('caseAddBtn').addEventListener('click', function () { editCase(null); });
  document.getElementById('caseFormCancel').addEventListener('click', function () { document.getElementById('caseFormWrap').style.display = 'none'; });
  document.getElementById('caseForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('caseId').value;
    var payload = {
      title: document.getElementById('caseTitle').value,
      task: document.getElementById('caseTask').value,
      solution: document.getElementById('caseSolution').value,
      result: document.getElementById('caseResult').value,
      published: document.getElementById('casePublished').checked,
      order: parseInt(document.getElementById('caseOrder').value, 10) || 0
    };
    var url = id ? API + '/cases/' + id : API + '/cases';
    var method = id ? 'PUT' : 'POST';
    fetchApi(url, { method: method, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function () { document.getElementById('caseFormWrap').style.display = 'none'; loadCases(); })
      .catch(function (err) { alert(err.message || aT('a_error')); });
  });

  // ——— Новости ———
  function loadNews() {
    var el = document.getElementById('newsList');
    el.innerHTML = aT('a_loading');
    fetchApi(API + '/news').then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.length === 0) { el.innerHTML = '<p>' + aT('a_noPosts') + '</p>'; return; }
        var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>' + aT('a_title') + '</th><th>' + aT('a_status') + '</th><th></th></tr></thead><tbody>';
        data.forEach(function (n) {
          html += '<tr><td>' + escapeHtml(n.title || '—') + '</td><td><span class="badge ' + (n.published ? 'badge-published' : 'badge-draft') + '">' + (n.published ? aT('a_published') : aT('a_draft')) + '</span></td><td><div class="row-actions"><button type="button" class="btn btn-outline btn-news-edit" data-id="' + escapeHtml(n.id) + '">' + aT('a_edit') + '</button><button type="button" class="btn btn-outline btn-news-publish" data-id="' + escapeHtml(n.id) + '" data-pub="' + !n.published + '">' + (n.published ? aT('a_unpublish') : aT('a_publish')) + '</button><button type="button" class="btn btn-outline btn-news-del" data-id="' + escapeHtml(n.id) + '">' + aT('a_remove') + '</button></div></td></tr>';
        });
        html += '</tbody></table></div>';
        el.innerHTML = html;
        el.querySelectorAll('.btn-news-edit').forEach(function (b) { b.addEventListener('click', function () { editNews(this.getAttribute('data-id')); }); });
        el.querySelectorAll('.btn-news-publish').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var pub = this.getAttribute('data-pub') === 'true';
            fetchApi(API + '/news/' + id + '/publish', { method: 'PATCH', body: JSON.stringify({ published: pub }) }).then(function () { loadNews(); });
          });
        });
        el.querySelectorAll('.btn-news-del').forEach(function (b) {
          b.addEventListener('click', function () {
            if (!confirm(aT('a_confirmDeleteNews'))) return;
            fetchApi(API + '/news/' + this.getAttribute('data-id'), { method: 'DELETE' }).then(function () { loadNews(); document.getElementById('newsFormWrap').style.display = 'none'; });
          });
        });
      })
      .catch(function () { el.innerHTML = '<p>' + aT('a_loadError') + '</p>'; });
  }

  function editNews(id) {
    if (!id) {
      document.getElementById('newsFormTitle').textContent = aT('a_newPost');
      document.getElementById('newsId').value = '';
      document.getElementById('newsTitle').value = '';
      document.getElementById('newsExcerpt').value = '';
      document.getElementById('newsBody').value = '';
      document.getElementById('newsPublished').checked = false;
      document.getElementById('newsFormWrap').style.display = 'block';
      return;
    }
    fetchApi(API + '/news/' + id).then(function (r) { return r.json(); })
      .then(function (n) {
        document.getElementById('newsFormTitle').textContent = aT('a_editPost');
        document.getElementById('newsId').value = n.id;
        document.getElementById('newsTitle').value = n.title || '';
        document.getElementById('newsExcerpt').value = n.excerpt || '';
        document.getElementById('newsBody').value = n.body || '';
        document.getElementById('newsPublished').checked = !!n.published;
        document.getElementById('newsFormWrap').style.display = 'block';
      });
  }

  document.getElementById('newsAddBtn').addEventListener('click', function () { editNews(null); });
  document.getElementById('newsFormCancel').addEventListener('click', function () { document.getElementById('newsFormWrap').style.display = 'none'; });
  document.getElementById('newsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('newsId').value;
    var payload = {
      title: document.getElementById('newsTitle').value,
      excerpt: document.getElementById('newsExcerpt').value,
      body: document.getElementById('newsBody').value,
      published: document.getElementById('newsPublished').checked
    };
    var url = id ? API + '/news/' + id : API + '/news';
    var method = id ? 'PUT' : 'POST';
    fetchApi(url, { method: method, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function () { document.getElementById('newsFormWrap').style.display = 'none'; loadNews(); })
      .catch(function (err) { alert(err.message || aT('a_error')); });
  });

  // ——— Настройки ———
  function loadSettings() {
    fetchApi(API + '/settings').then(function (r) { return r.json(); })
      .then(function (s) {
        document.getElementById('setPhone').value = s.phone || '';
        document.getElementById('setEmail').value = s.email || '';
        document.getElementById('setAddress').value = s.address || '';
        document.getElementById('setTelegram').value = (s.social && s.social.telegram) || '';
        document.getElementById('setWhatsapp').value = (s.social && s.social.whatsapp) || '';
        document.getElementById('setInstagram').value = (s.social && s.social.instagram) || '';
        document.getElementById('setMetaTitle').value = (s.meta && s.meta.defaultTitle) || '';
        document.getElementById('setMetaDesc').value = (s.meta && s.meta.defaultDescription) || '';
        document.getElementById('setNotificationEmail').value = s.notificationEmail || '';
        document.getElementById('setSmtpHost').value = (s.smtp && s.smtp.host) || '';
        document.getElementById('setSmtpPort').value = (s.smtp && s.smtp.port) || '';
        document.getElementById('setSmtpUser').value = (s.smtp && s.smtp.user) || '';
      });
  }

  document.getElementById('settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var payload = {
      phone: document.getElementById('setPhone').value,
      email: document.getElementById('setEmail').value,
      address: document.getElementById('setAddress').value,
      social: {
        telegram: document.getElementById('setTelegram').value,
        whatsapp: document.getElementById('setWhatsapp').value,
        instagram: document.getElementById('setInstagram').value
      },
      meta: {
        defaultTitle: document.getElementById('setMetaTitle').value,
        defaultDescription: document.getElementById('setMetaDesc').value
      },
      notificationEmail: document.getElementById('setNotificationEmail').value,
      smtp: {
        host: document.getElementById('setSmtpHost').value,
        port: parseInt(document.getElementById('setSmtpPort').value, 10) || undefined,
        user: document.getElementById('setSmtpUser').value,
        auth: document.getElementById('setSmtpUser').value ? true : false
      }
    };
    var pass = document.getElementById('setSmtpPass').value;
    if (pass) payload.smtp.pass = pass;
    fetchApi(API + '/settings', { method: 'PUT', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function () {
        document.getElementById('settingsStatus').textContent = aT('a_saved');
        document.getElementById('settingsStatus').className = 'form-status success';
      })
      .catch(function (err) {
        document.getElementById('settingsStatus').textContent = err.message || aT('a_error');
        document.getElementById('settingsStatus').className = 'form-status error';
      });
  });

  // ——— Пользователи ———
  function loadUsers() {
    var el = document.getElementById('usersList');
    el.innerHTML = aT('a_loading');
    fetchApi(API + '/users').then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.length === 0) { el.innerHTML = '<p>' + aT('a_noUsers') + '</p>'; return; }
        var html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>' + aT('a_login') + '</th><th>' + aT('a_role') + '</th><th></th></tr></thead><tbody>';
        data.forEach(function (u) {
          var roleLabel = (u.role === 'admin') ? aT('a_administrator') : aT('a_editor');
          html += '<tr><td>' + escapeHtml(u.login) + '</td><td>' + roleLabel + '</td><td><button type="button" class="btn btn-outline btn-user-pass" data-id="' + escapeHtml(u.id) + '">' + aT('a_changePass') + '</button> <button type="button" class="btn btn-outline btn-user-del" data-id="' + escapeHtml(u.id) + '">' + aT('a_remove') + '</button></td></tr>';
        });
        html += '</tbody></table></div>';
        el.innerHTML = html;
        el.querySelectorAll('.btn-user-pass').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var pass = prompt(aT('a_newPass'));
            if (!pass) return;
            fetchApi(API + '/users/' + id + '/password', { method: 'PUT', body: JSON.stringify({ password: pass }) })
              .then(function () { alert(aT('a_passChanged')); loadUsers(); })
              .catch(function (err) { alert(err.message || aT('a_error')); });
          });
        });
        el.querySelectorAll('.btn-user-del').forEach(function (b) {
          b.addEventListener('click', function () {
            if (!confirm(aT('a_confirmDeleteUser'))) return;
            fetchApi(API + '/users/' + this.getAttribute('data-id'), { method: 'DELETE' }).then(function () { loadUsers(); }).catch(function (err) { alert(err.message); });
          });
        });
      })
      .catch(function (err) { el.innerHTML = '<p>' + aT('a_forbiddenOrError') + '</p>'; });
  }

  document.getElementById('userForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var login = document.getElementById('userLogin').value;
    var password = document.getElementById('userPassword').value;
    var role = document.getElementById('userRole').value;
    fetchApi(API + '/users', { method: 'POST', body: JSON.stringify({ login: login, password: password, role: role }) })
      .then(function (r) { return r.json(); })
      .then(function () {
        document.getElementById('userLogin').value = '';
        document.getElementById('userPassword').value = '';
        loadUsers();
      })
      .catch(function (err) { alert(err.message || aT('a_error')); });
  });

  // Инициализация
  if (token) {
    fetchApi(API + '/me').then(function (r) { return r.json(); })
      .then(function (data) {
        currentUser = data.user;
        showAdmin();
      })
      .catch(function () { showLogin(); });
  } else {
    showLogin();
  }
})();
