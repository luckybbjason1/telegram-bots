/**
 * 텔레그램봇허브 — Admin Panel Logic
 * Modules: AdminStorage · AdminAuth · AdminUI · AdminDashboard · AdminAds · AdminLinks
 *
 * Security note: innerHTML is used intentionally in two controlled contexts:
 * 1. Ad preview — admin-authored HTML content (trusted source)
 * 2. Tables — all user-submitted strings are sanitized via AdminUI.sanitize()
 */
(function () {
  'use strict';

  /* ============================================================
     DEFAULT CREDENTIALS  (change after first login via code)
     ============================================================ */
  const DEFAULT_USER = 'admin';
  const DEFAULT_PASS = 'admin888';   // Change this before deploying

  /* ============================================================
     STORAGE MODULE
     ============================================================ */
  const AdminStorage = {
    DEFAULT_ADS: {
      banner:  { enabled: false, title: '', content: '', link: '', imageUrl: '', clickCount: 0 },
      sidebar: { enabled: false, title: '', content: '', link: '', imageUrl: '', clickCount: 0 },
      inline:  { enabled: false, title: '', content: '', link: '', imageUrl: '', clickCount: 0 },
      footer:  { enabled: false, title: '', content: '', link: '', imageUrl: '', clickCount: 0 },
    },

    _parse(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    _save(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

    getAdsConfig()    { return { ...this.DEFAULT_ADS, ...this._parse('ads_config', {}) }; },
    setAdsConfig(d)   { this._save('ads_config', d); },

    getLinks()        { return this._parse('friend_links', []); },
    setLinks(arr)     { this._save('friend_links', arr); },

    getStats()        {
      return this._parse('site_stats', {
        totalVisits: 0,
        dailyVisits: {},
        botClicks:   {},
        adClicks:    { banner: 0, sidebar: 0, inline: 0, footer: 0 },
      });
    },
    setStats(d)       { this._save('site_stats', d); },

    getAuth()         { return this._parse('admin_auth', null); },
    setAuth(d)        { this._save('admin_auth', d); },

    generateId()      { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); },
  };

  /* ============================================================
     AUTH MODULE
     ============================================================ */
  const AdminAuth = {
    async hashStr(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async init() {
      let auth = AdminStorage.getAuth();
      if (!auth || !auth.username) {
        auth = {
          username:     await this.hashStr(DEFAULT_USER),
          passwordHash: await this.hashStr(DEFAULT_PASS),
          sessionToken: null,
          sessionExpiry: 0,
        };
        AdminStorage.setAuth(auth);
      }
      if (this.isAuthenticated()) {
        this.showApp();
      } else {
        this.showLogin();
      }
    },

    isAuthenticated() {
      const auth = AdminStorage.getAuth();
      return auth && auth.sessionToken && Date.now() < (auth.sessionExpiry || 0);
    },

    async login(username, password) {
      const auth = AdminStorage.getAuth();
      const uHash = await this.hashStr(username);
      const pHash = await this.hashStr(password);
      if (uHash === auth.username && pHash === auth.passwordHash) {
        const token = AdminStorage.generateId();
        AdminStorage.setAuth({ ...auth, sessionToken: token, sessionExpiry: Date.now() + 86400000 });
        document.getElementById('admin-username').textContent = username;
        return true;
      }
      return false;
    },

    logout() {
      const auth = AdminStorage.getAuth();
      if (auth) AdminStorage.setAuth({ ...auth, sessionToken: null, sessionExpiry: 0 });
      AdminAuth.showLogin();
    },

    showLogin() {
      document.getElementById('login-screen').classList.remove('hidden');
      document.getElementById('admin-app').classList.add('hidden');
    },

    showApp() {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('admin-app').classList.remove('hidden');
      AdminUI.navigateTo('dashboard');
      AdminDashboard.render();
    },
  };

  /* ============================================================
     UI MODULE
     ============================================================ */
  const AdminUI = {
    navigateTo(page) {
      document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
      });
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
      const titles = { dashboard: '数据仪表盘', ads: '广告位管理', links: '友情链接管理' };
      document.getElementById('page-title').textContent = titles[page] || page;
      if (page === 'ads')   AdminAds.render();
      if (page === 'links') AdminLinks.render();
    },

    showToast(msg, type) {
      type = type || 'info';
      const container = document.getElementById('toast-container');
      const icons = { success: '✅', error: '❌', info: 'ℹ️' };
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'toast-icon';
      iconSpan.textContent = icons[type] || icons.info;
      const msgSpan = document.createElement('span');
      msgSpan.textContent = msg;
      el.appendChild(iconSpan);
      el.appendChild(msgSpan);
      container.appendChild(el);
      requestAnimationFrame(function() { requestAnimationFrame(function() { el.classList.add('show'); }); });
      setTimeout(function() {
        el.classList.remove('show');
        setTimeout(function() { el.remove(); }, 350);
      }, 3000);
    },

    openModal(id) {
      const m = document.getElementById(id);
      if (m) {
        m.style.display = 'flex';
        requestAnimationFrame(function() { m.classList.add('open'); });
      }
    },

    closeModal(id) {
      const m = document.getElementById(id);
      if (m) {
        m.classList.remove('open');
        setTimeout(function() { m.style.display = 'none'; }, 220);
      }
    },

    formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.getFullYear() + '-' +
             String(d.getMonth()+1).padStart(2,'0') + '-' +
             String(d.getDate()).padStart(2,'0') + ' ' +
             String(d.getHours()).padStart(2,'0') + ':' +
             String(d.getMinutes()).padStart(2,'0');
    },

    // Escape HTML entities for displaying user-submitted text in HTML context
    sanitize(str) {
      return String(str || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#x27;');
    },
  };

  /* ============================================================
     DASHBOARD MODULE
     ============================================================ */
  const AdminDashboard = {
    charts: {},

    render() {
      const stats = AdminStorage.getStats();

      document.getElementById('stat-total-visits').textContent = stats.totalVisits.toLocaleString();
      const today = new Date().toISOString().slice(0, 10);
      const todayV = stats.dailyVisits[today] || 0;
      document.getElementById('stat-visits-change').textContent = '\u2191 今日 +' + todayV;

      const totalBot = Object.values(stats.botClicks || {}).reduce(function(a,b){return a+b;}, 0);
      document.getElementById('stat-bot-clicks').textContent = totalBot.toLocaleString();

      const totalAd = Object.values(stats.adClicks || {}).reduce(function(a,b){return a+b;}, 0);
      document.getElementById('stat-ad-clicks').textContent = totalAd.toLocaleString();
      const ctr = stats.totalVisits > 0 ? ((totalAd / stats.totalVisits) * 100).toFixed(2) : '0.00';
      document.getElementById('stat-ad-ctr').textContent = 'CTR ' + ctr + '%';

      const pendingLinks = AdminStorage.getLinks().filter(function(l){return l.status === 'pending';}).length;
      document.getElementById('stat-pending-links').textContent = pendingLinks;
      document.getElementById('stat-links-info').textContent = pendingLinks > 0
        ? '\u26a0 有 ' + pendingLinks + ' 条待审核' : '暂无待审核';

      this.initCharts(stats);
    },

    initCharts(stats) {
      if (typeof Chart === 'undefined') {
        setTimeout(function(){ AdminDashboard.initCharts(stats); }, 200);
        return;
      }
      const last7 = this._last7Days();
      const visitData = last7.map(function(d){ return stats.dailyVisits[d] || 0; });

      this._createOrUpdate('chart-visits', 'line', {
        labels: last7.map(function(d){ return d.slice(5); }),
        datasets: [{
          label: '访问量', data: visitData,
          borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.12)',
          fill: true, tension: 0.4, pointBackgroundColor: '#6C63FF', pointRadius: 4,
        }],
      }, {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
      });

      const botLabels = ['\ub3c4\ub77c\uc5d0\ubab9','\ub85c\ub610\ubd07','\uce74\ubd07','USDT\ubaa8\ub2c8','\uc774\ubaa8\uc9c0','\ud3ec\ucee4','Chain','USDTBank'];
      const botKeys   = ['bot-dremshop','bot-lotto','bot-kard','bot-usdt','bot-emoji','bot-poker','bot-chain','bot-usdtbank'];
      const botData   = botKeys.map(function(k){ return stats.botClicks[k] || 0; });

      this._createOrUpdate('chart-bots', 'bar', {
        labels: botLabels,
        datasets: [{
          label: '点击数', data: botData,
          backgroundColor: ['#6C63FF','#FFD700','#9B5DE5','#00FFC8','#FF69B4','#FF4444','#00B4D8','#00E5A0'],
          borderRadius: 6,
        }],
      }, {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      });

      const adClicks = stats.adClicks || {};
      this._createOrUpdate('chart-ads', 'doughnut', {
        labels: ['横幅','侧边','中间','底部'],
        datasets: [{
          data: [adClicks.banner||0, adClicks.sidebar||0, adClicks.inline||0, adClicks.footer||0],
          backgroundColor: ['#6C63FF','#00B4D8','#00E5A0','#FFD700'],
          borderWidth: 2, borderColor: '#fff',
        }],
      }, {
        plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 14 } } },
        cutout: '60%',
      });
    },

    _createOrUpdate(canvasId, type, data, options) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      if (this.charts[canvasId]) {
        this.charts[canvasId].data = data;
        this.charts[canvasId].update();
        return;
      }
      this.charts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: type, data: data,
        options: Object.assign({ responsive: true, maintainAspectRatio: false }, options),
      });
    },

    _last7Days() {
      var days = [];
      for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      return days;
    },
  };

  /* ============================================================
     ADS MODULE
     ============================================================ */
  var ADS_META = {
    banner:  { label: '横幅广告', pos: 'Hero 下方', icon: '📣' },
    sidebar: { label: '侧边广告', pos: '右侧浮动',  icon: '📌' },
    inline:  { label: '中间广告', pos: 'Bot 4 后',  icon: '📎' },
    footer:  { label: '底部广告', pos: 'CTA 下方',  icon: '🔖' },
  };

  const AdminAds = {
    render() {
      const cfg = AdminStorage.getAdsConfig();
      const grid = document.getElementById('ads-grid');
      if (!grid) return;
      grid.textContent = '';

      Object.entries(ADS_META).forEach(function(entry) {
        var key  = entry[0];
        var meta = entry[1];
        var ad   = cfg[key] || {};

        var card = document.createElement('div');
        card.className = 'ad-manage-card';
        card.dataset.adKey = key;

        // Header
        var hdr = document.createElement('div');
        hdr.className = 'ad-card-header';

        var titleDiv = document.createElement('div');
        titleDiv.className = 'ad-card-title';
        titleDiv.textContent = meta.icon + ' ' + meta.label;
        var badge = document.createElement('span');
        badge.className = 'ad-position-badge';
        badge.textContent = meta.pos;
        titleDiv.appendChild(badge);
        hdr.appendChild(titleDiv);

        var toggleWrap = document.createElement('div');
        toggleWrap.className = 'toggle-wrap';
        var label = document.createElement('label');
        label.className = 'toggle';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'ad-toggle';
        cb.dataset.key = key;
        cb.checked = !!ad.enabled;
        var slider = document.createElement('span');
        slider.className = 'toggle-slider';
        label.appendChild(cb);
        label.appendChild(slider);
        var toggleLabel = document.createElement('span');
        toggleLabel.className = 'toggle-label';
        toggleLabel.textContent = ad.enabled ? '开启' : '关闭';
        toggleWrap.appendChild(label);
        toggleWrap.appendChild(toggleLabel);
        hdr.appendChild(toggleWrap);
        card.appendChild(hdr);

        cb.addEventListener('change', function() {
          toggleLabel.textContent = cb.checked ? '开启' : '关闭';
        });

        // Form fields
        AdminAds._addField(card, key, 'title',    '广告标题',          'text',     ad.title    || '', '广告标题（可选）');
        var contentGroup = AdminAds._addField(card, key, 'content',  '广告内容 / HTML', 'textarea', ad.content  || '', '支持 HTML，如 <b>促销文字</b>');
        AdminAds._addField(card, key, 'link',     '跳转链接',          'url',      ad.link     || '', 'https://example.com');
        AdminAds._addField(card, key, 'imageUrl', '图片 URL（可选）',  'url',      ad.imageUrl || '', 'https://example.com/banner.jpg');

        // Preview box
        var previewGroup = document.createElement('div');
        previewGroup.className = 'ad-form-group';
        var previewLabel = document.createElement('label');
        previewLabel.textContent = '预览';
        var previewBox = document.createElement('div');
        previewBox.className = 'ad-preview-box' + (ad.content ? ' has-content' : '');
        previewBox.id = 'preview-' + key;
        /* Admin-authored ad content is intentionally rendered as HTML for preview */
        if (ad.content) {
          previewBox.textContent = '';
          var tmp = document.createRange().createContextualFragment(ad.content);
          previewBox.appendChild(tmp);
        } else {
          previewBox.textContent = '暂无内容';
          previewBox.style.opacity = '0.5';
        }
        previewGroup.appendChild(previewLabel);
        previewGroup.appendChild(previewBox);
        card.appendChild(previewGroup);

        // Bind preview update for the content textarea
        var contentTextarea = contentGroup && contentGroup.querySelector('textarea');
        if (contentTextarea) {
          contentTextarea.addEventListener('input', function() {
            previewBox.textContent = '';
            previewBox.style.opacity = '';
            if (contentTextarea.value) {
              previewBox.classList.add('has-content');
              try {
                var frag = document.createRange().createContextualFragment(contentTextarea.value);
                previewBox.appendChild(frag);
              } catch(e) {
                previewBox.textContent = contentTextarea.value;
              }
            } else {
              previewBox.classList.remove('has-content');
              previewBox.textContent = '暂无内容';
              previewBox.style.opacity = '0.5';
            }
          });
        }

        // Click counter
        var infoDiv = document.createElement('div');
        infoDiv.className = 'text-muted mt-4';
        infoDiv.textContent = '📊 历史点击: ';
        var strong = document.createElement('strong');
        strong.textContent = (ad.clickCount || 0) + ' 次';
        infoDiv.appendChild(strong);
        card.appendChild(infoDiv);

        grid.appendChild(card);
      });
    },

    _addField(card, key, field, labelText, inputType, value, placeholder) {
      var group = document.createElement('div');
      group.className = 'ad-form-group';
      var lbl = document.createElement('label');
      lbl.textContent = labelText;
      var input;
      if (inputType === 'textarea') {
        input = document.createElement('textarea');
        input.textContent = value;
      } else {
        input = document.createElement('input');
        input.type = inputType;
        input.value = value;
      }
      input.className = 'ad-input';
      input.dataset.key = key;
      input.dataset.field = field;
      input.placeholder = placeholder || '';
      group.appendChild(lbl);
      group.appendChild(input);
      card.appendChild(group);
      return group;
    },

    save() {
      const cfg = AdminStorage.getAdsConfig();
      document.querySelectorAll('.ad-manage-card').forEach(function(card) {
        var key = card.dataset.adKey;
        if (!key) return;
        var toggle = card.querySelector('.ad-toggle');
        cfg[key] = {
          enabled:    toggle ? toggle.checked : false,
          title:      (card.querySelector('[data-field="title"]')?.value    || '').trim(),
          content:    (card.querySelector('[data-field="content"]')?.value  || '').trim(),
          link:       (card.querySelector('[data-field="link"]')?.value     || '').trim(),
          imageUrl:   (card.querySelector('[data-field="imageUrl"]')?.value || '').trim(),
          clickCount: cfg[key] ? (cfg[key].clickCount || 0) : 0,
        };
      });
      AdminStorage.setAdsConfig(cfg);
      AdminUI.showToast('广告设置已保存 ✓', 'success');
    },
  };

  /* ============================================================
     LINKS MODULE
     ============================================================ */
  const AdminLinks = {
    currentTab: 'pending',

    render() {
      this._updateBadges();
      this.renderTable(this.currentTab);
    },

    renderTable(status) {
      this.currentTab = status;
      const links = AdminStorage.getLinks().filter(function(l){ return l.status === status; });
      const container = document.getElementById('links-table-container');
      if (!container) return;
      container.textContent = '';

      if (links.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const icon = document.createElement('div');
        icon.className = 'empty-icon';
        icon.textContent = status === 'pending' ? '📭' : status === 'approved' ? '✅' : '🚫';
        const msg = document.createElement('p');
        msg.textContent = status === 'pending' ? '暂无待审核申请' : status === 'approved' ? '暂无已通过友链' : '暂无已拒绝记录';
        empty.appendChild(icon);
        empty.appendChild(msg);
        container.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'links-table';
      const thead = table.createTHead();
      const hRow = thead.insertRow();
      ['网站名称','URL','描述','申请时间','操作'].forEach(function(h) {
        var th = document.createElement('th');
        th.textContent = h;
        hRow.appendChild(th);
      });

      const tbody = table.createTBody();
      const self = this;
      links.forEach(function(link) {
        const row = tbody.insertRow();

        // Name cell
        const nameCell = row.insertCell();
        nameCell.dataset.label = '网站名称';
        if (link.logoUrl) {
          const img = document.createElement('img');
          img.src = link.logoUrl;
          img.width = 18;
          img.alt = '';
          img.style.cssText = 'display:inline;vertical-align:middle;margin-right:5px;border-radius:3px';
          img.onerror = function(){ this.style.display='none'; };
          nameCell.appendChild(img);
        }
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = link.siteName;
        nameCell.appendChild(nameStrong);
        if (link.contactEmail) {
          const emailDiv = document.createElement('div');
          emailDiv.className = 'text-muted mt-4';
          emailDiv.textContent = link.contactEmail;
          nameCell.appendChild(emailDiv);
        }

        // URL cell
        const urlCell = row.insertCell();
        urlCell.className = 'td-url';
        urlCell.dataset.label = 'URL';
        const urlA = document.createElement('a');
        urlA.href = link.siteUrl;
        urlA.target = '_blank';
        urlA.rel = 'noopener';
        urlA.textContent = link.siteUrl;
        urlCell.appendChild(urlA);

        // Desc cell
        const descCell = row.insertCell();
        descCell.dataset.label = '描述';
        descCell.textContent = link.siteDesc || '—';

        // Date cell
        const dateCell = row.insertCell();
        dateCell.dataset.label = '申请时间';
        dateCell.textContent = AdminUI.formatDate(link.submittedAt);

        // Actions cell
        const actCell = row.insertCell();
        actCell.dataset.label = '操作';
        const actDiv = document.createElement('div');
        actDiv.className = 'table-actions';

        if (status === 'pending') {
          const approveBtn = self._makeBtn('✓ 通过', 'btn btn-success btn-xs', function(){ AdminLinks.approve(link.id); });
          const rejectBtn  = self._makeBtn('✕ 拒绝', 'btn btn-danger btn-xs',  function(){ AdminLinks.reject(link.id);  });
          actDiv.appendChild(approveBtn);
          actDiv.appendChild(rejectBtn);
        }
        if (status === 'approved') {
          const editBtn   = self._makeBtn('✏ 编辑', 'btn btn-ghost btn-xs',   function(){ AdminLinks.openEdit(link.id); });
          const deleteBtn = self._makeBtn('🗑 删除', 'btn btn-danger btn-xs',  function(){ AdminLinks.delete(link.id);  });
          actDiv.appendChild(editBtn);
          actDiv.appendChild(deleteBtn);
        }
        if (status === 'rejected') {
          const approveBtn = self._makeBtn('↩ 重新通过', 'btn btn-success btn-xs', function(){ AdminLinks.approve(link.id); });
          const deleteBtn  = self._makeBtn('🗑 删除',     'btn btn-danger btn-xs',  function(){ AdminLinks.delete(link.id);  });
          actDiv.appendChild(approveBtn);
          actDiv.appendChild(deleteBtn);
        }

        actCell.appendChild(actDiv);
        tbody.appendChild(row);
      });

      container.appendChild(table);
    },

    _makeBtn(text, className, handler) {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.className = className;
      btn.addEventListener('click', handler);
      return btn;
    },

    approve(id) {
      const links = AdminStorage.getLinks();
      const idx = links.findIndex(function(l){ return l.id === id; });
      if (idx === -1) return;
      links[idx].status = 'approved';
      links[idx].reviewedAt = new Date().toISOString();
      AdminStorage.setLinks(links);
      AdminUI.showToast('已通过 ✓', 'success');
      this.render();
    },

    reject(id) {
      if (!confirm('确认拒绝该友链申请？')) return;
      const links = AdminStorage.getLinks();
      const idx = links.findIndex(function(l){ return l.id === id; });
      if (idx === -1) return;
      links[idx].status = 'rejected';
      links[idx].reviewedAt = new Date().toISOString();
      AdminStorage.setLinks(links);
      AdminUI.showToast('已拒绝', 'info');
      this.render();
    },

    delete(id) {
      if (!confirm('确认删除该友链记录？此操作不可撤销。')) return;
      const links = AdminStorage.getLinks().filter(function(l){ return l.id !== id; });
      AdminStorage.setLinks(links);
      AdminUI.showToast('已删除', 'info');
      this.render();
    },

    openAdd() {
      document.getElementById('modal-link-title').textContent = '添加友情链接';
      document.getElementById('link-edit-id').value = '';
      document.getElementById('form-link').reset();
      document.getElementById('modal-link-submit').textContent = '添加';
      AdminUI.openModal('modal-link');
    },

    openEdit(id) {
      const link = AdminStorage.getLinks().find(function(l){ return l.id === id; });
      if (!link) return;
      document.getElementById('modal-link-title').textContent = '编辑友情链接';
      document.getElementById('link-edit-id').value    = id;
      document.getElementById('link-sitename').value   = link.siteName     || '';
      document.getElementById('link-url').value        = link.siteUrl      || '';
      document.getElementById('link-desc').value       = link.siteDesc     || '';
      document.getElementById('link-logo').value       = link.logoUrl      || '';
      document.getElementById('link-email').value      = link.contactEmail || '';
      document.getElementById('modal-link-submit').textContent = '保存';
      AdminUI.openModal('modal-link');
    },

    saveLink() {
      const siteName = document.getElementById('link-sitename').value.trim();
      const siteUrl  = document.getElementById('link-url').value.trim();
      if (!siteName) { AdminUI.showToast('网站名称不能为空', 'error'); return; }
      if (!siteUrl)  { AdminUI.showToast('网站 URL 不能为空', 'error'); return; }

      const links  = AdminStorage.getLinks();
      const editId = document.getElementById('link-edit-id').value;

      if (editId) {
        const idx = links.findIndex(function(l){ return l.id === editId; });
        if (idx !== -1) {
          links[idx].siteName     = siteName;
          links[idx].siteUrl      = siteUrl;
          links[idx].siteDesc     = document.getElementById('link-desc').value.trim();
          links[idx].logoUrl      = document.getElementById('link-logo').value.trim();
          links[idx].contactEmail = document.getElementById('link-email').value.trim();
        }
        AdminUI.showToast('友链已更新 ✓', 'success');
      } else {
        links.push({
          id:           AdminStorage.generateId(),
          siteName:     siteName,
          siteUrl:      siteUrl,
          siteDesc:     document.getElementById('link-desc').value.trim(),
          logoUrl:      document.getElementById('link-logo').value.trim(),
          contactEmail: document.getElementById('link-email').value.trim(),
          status:       'approved',
          submittedAt:  new Date().toISOString(),
          reviewedAt:   new Date().toISOString(),
        });
        AdminUI.showToast('友链已添加 ✓', 'success');
      }

      AdminStorage.setLinks(links);
      AdminUI.closeModal('modal-link');
      this.render();
    },

    switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(function(b){
        b.classList.toggle('active', b.dataset.tab === tab);
      });
      this.renderTable(tab);
    },

    _updateBadges() {
      const links = AdminStorage.getLinks();
      const badge = document.getElementById('badge-pending');
      if (badge) badge.textContent = links.filter(function(l){ return l.status === 'pending'; }).length;
    },
  };

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', async function() {
    await AdminAuth.init();

    // Login form
    document.getElementById('login-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const u  = document.getElementById('login-username').value.trim();
      const p  = document.getElementById('login-password').value;
      const ok = await AdminAuth.login(u, p);
      if (ok) {
        AdminAuth.showApp();
      } else {
        document.getElementById('login-error').classList.add('show');
      }
    });

    ['login-username','login-password'].forEach(function(id) {
      document.getElementById(id).addEventListener('input', function() {
        document.getElementById('login-error').classList.remove('show');
      });
    });

    // Sidebar nav
    document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(function(item) {
      item.addEventListener('click', function(){ AdminUI.navigateTo(item.dataset.page); });
      item.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') AdminUI.navigateTo(item.dataset.page);
      });
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', function() {
      if (confirm('确认退出登录？')) AdminAuth.logout();
    });

    // Ads save
    document.getElementById('btn-save-ads').addEventListener('click', function(){ AdminAds.save(); });

    // Reset stats
    document.getElementById('btn-reset-stats').addEventListener('click', function() {
      if (!confirm('确认重置所有统计数据？此操作不可撤销。')) return;
      AdminStorage.setStats({ totalVisits:0, dailyVisits:{}, botClicks:{}, adClicks:{banner:0,sidebar:0,inline:0,footer:0} });
      AdminDashboard.render();
      AdminUI.showToast('统计数据已重置', 'info');
    });

    // Links: add
    document.getElementById('btn-add-link').addEventListener('click', function(){ AdminLinks.openAdd(); });

    // Links: tabs
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function(){ AdminLinks.switchTab(btn.dataset.tab); });
    });

    // Modal close
    document.getElementById('modal-link-close').addEventListener('click',  function(){ AdminUI.closeModal('modal-link'); });
    document.getElementById('modal-link-cancel').addEventListener('click', function(){ AdminUI.closeModal('modal-link'); });
    document.getElementById('modal-link').addEventListener('click', function(e) {
      if (e.target === document.getElementById('modal-link')) AdminUI.closeModal('modal-link');
    });
    document.getElementById('form-link').addEventListener('submit', function(e) {
      e.preventDefault();
      AdminLinks.saveLink();
    });

    // Hamburger
    var hamburgerBtn = document.getElementById('hamburger-btn');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      });
      overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  });

  // Global references for inline event handlers (quick-nav buttons)
  window.AdminUI    = AdminUI;
  window.AdminLinks = AdminLinks;
  window.AdminAds   = AdminAds;

})();
