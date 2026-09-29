// Kimi Web 增强：全宽切换（菜单项）+ 输入框圆角 + 审批卡键盘操作
(function () {
  'use strict';

  // ===== 全宽切换 =====
  var MODE_KEY = 'kimi-web-wide-mode';
  var MENU_ITEM_ID = 'kimi-web-wide-menu-item';

  // 常驻样式（不随全宽开关变化）：调小输入框圆角（原生 --radius-composer: 32px）
  var BASE_CSS = [
    '.composer-card { border-radius: 16px !important; corner-shape: round !important; }',
    '.composer-card:focus-within:after { border-radius: 16px !important; corner-shape: round !important; }',
    // 聚焦描边的透明度渐变动画（0.26s）在圆角改动后视觉上像闪烁，禁用过渡让其瞬间切换
    '.composer-card:after { transition: none !important; }',
    // 全宽模式下审批/提问卡片会铺满窗口宽度（原生靠 dock 限宽约束，全宽被去掉后失效），
    // 给卡片加左右内缩，与输入框的 --dock-inline-* 边距对齐
    '.dock-approval, .dock-question { margin-inline: var(--dock-inline-left, 16px) var(--dock-inline-right, 16px) !important; }'
  ].join('\n');

  // 全宽模式：内容全宽 + 输入框全宽 + 隐藏 TOC
  var WIDE_CSS = [
    '.content-wrap.align-center { max-width: none !important; }',
    '.chat-dock.align-center { max-width: none !important; }',
    '.conversation-toc { display: none !important; }'
  ].join('\n');

  // 菜单项的作用域 ID（让 app 的 scoped 样式作用于注入的元素）
  var MENU_SCOPE = 'data-v-607794d8';

  // lucide "square-text" 图标（方框+文本行，符合内容/布局主题）
  var ICON_CODE =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect width="18" height="18" x="3" y="3" rx="2"/>' +
    '<path d="M7 8h8"/>' +
    '<path d="M7 12h10"/>' +
    '<path d="M7 16h6"/>' +
    '</svg>';

  var styleEl = null;

  function getMode() {
    var v = localStorage.getItem(MODE_KEY);
    if (v === null) return true; // 默认开启全宽
    return v === '1';
  }

  function setMode(wide) {
    localStorage.setItem(MODE_KEY, wide ? '1' : '0');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'kimi-web-wide-style';
      document.head.appendChild(styleEl);
    }
    // 常驻样式 + 全宽样式（全宽关闭时仅保留常驻部分）
    styleEl.textContent = BASE_CSS + '\n' + (wide ? WIDE_CSS : '');
    updateMenuItem();
  }

  // 更新菜单项文字（无高亮背景，仅文本反映当前状态）
  function updateMenuItem() {
    var item = document.getElementById(MENU_ITEM_ID);
    if (!item) return;
    var label = item.querySelector('.kimi-wide-label');
    if (getMode()) {
      if (label) label.textContent = '标准宽度';
      item.title = '点击切换为标准宽度（恢复默认，显示TOC）';
    } else {
      if (label) label.textContent = '全宽显示';
      item.title = '点击切换为全宽（内容全宽，隐藏TOC）';
    }
  }

  // 向打开的菜单注入菜单项（图标 + 文字）
  function injectMenuItem() {
    var menu = document.querySelector('.ui-menu.ch-menu');
    if (!menu) return;
    if (document.getElementById(MENU_ITEM_ID)) return;

    // 图标占位与原生一致：外层 16px 固定槽位（原生 svg 宽 16px），内部图标 14px 居中
    var sizeStyle = document.createElement('style');
    sizeStyle.id = MENU_ITEM_ID + '-size';
    sizeStyle.textContent =
      '#' + MENU_ITEM_ID + ' svg { width: 14px !important; height: 14px !important; }' +
      '#' + MENU_ITEM_ID + ' .kimi-wide-icon { display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; flex:none; }';
    document.head.appendChild(sizeStyle);

    var item = document.createElement('div');
    item.id = MENU_ITEM_ID;
    item.className = 'ui-menu-item ui-menu-item--md';
    item.setAttribute('role', 'menuitem');
    // 带上作用域属性，让 app 的原生菜单样式（内边距/图标色/悬停）全部生效，
    // 不添加任何内联样式，保证图标与其他菜单项精确对齐。
    // 作用域哈希随构建变化（rc/正式版不同），从菜单内原生项实时读取；
    // 菜单里暂时没有原生项时退回已知哈希兜底。
    var scope = MENU_SCOPE;
    var nativeItems = menu.querySelectorAll('.ui-menu-item');
    for (var i = 0; i < nativeItems.length; i++) {
      var a = nativeItems[i].attributes;
      for (var j = 0; j < a.length; j++) {
        if (/^data-v-[0-9a-f]+$/.test(a[j].name)) { scope = a[j].name; i = nativeItems.length; break; }
      }
    }
    item.setAttribute(scope, '');
    item.innerHTML = '<span class="kimi-wide-icon">' + ICON_CODE + '</span><span class="kimi-wide-label"></span>';

    // 点击：切换模式 + 关闭菜单（与原生菜单项行为一致）
    item.addEventListener('click', function () {
      setMode(!getMode());
      closeMenu();
    });
    // 悬停反馈（仅背景色，不干扰布局；无选中高亮）
    item.addEventListener('mouseenter', function () {
      item.style.background = 'var(--color-hover,rgba(128,128,128,.1))';
    });
    item.addEventListener('mouseleave', function () {
      item.style.background = 'transparent';
    });

    menu.insertBefore(item, menu.firstChild);
    updateMenuItem();
  }

  // ===== 审批卡片：上下键切换选项 + 回车确认 =====
  // 终端 CLI 里回车默认选主选项；web 端原生只绑了数字键（.knum 1/2/3/4）。
  // 这里补全：↑/↓ 在选项按钮间移动高亮（循环），Enter 确认当前高亮项。
  // 打开新卡片时高亮默认停在主选项（.amain，即数字 1），Enter 直接确认。
  // 焦点在输入框/可编辑元素上时不拦截（方向键移动光标、回车发送消息）。
  var FOCUS_CLASS = 'kimi-wide-appr-focus';
  var apprSel = { card: null, idx: -1 };

  // 审批卡上可见且可用的选项按钮
  function approvalButtons(card) {
    var btns = card.querySelectorAll('.abtns .ui-button');
    var out = [];
    for (var i = 0; i < btns.length; i++) {
      if (!btns[i].disabled && btns[i].getClientRects().length) out.push(btns[i]);
    }
    return out;
  }

  function setApprovalFocus(btns, idx) {
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle(FOCUS_CLASS, i === idx);
    }
    apprSel.idx = idx;
  }

  function bindEnterApproval() {
    // 高亮样式：与原生 focus-ring 一致的强调色描边
    var s = document.createElement('style');
    s.textContent = '.' + FOCUS_CLASS + ' { outline: 2px solid var(--color-accent) !important; outline-offset: 1px !important; }';
    document.head.appendChild(s);

    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      var card = document.querySelector('.appr');
      // 无卡片：清除残留高亮与状态
      if (!card) {
        if (apprSel.card) {
          apprSel.card.querySelectorAll('.' + FOCUS_CLASS).forEach(function (b) { b.classList.remove(FOCUS_CLASS); });
          apprSel = { card: null, idx: -1 };
        }
        return;
      }
      var btns = approvalButtons(card);
      if (!btns.length) return;
      // 新卡片：默认高亮主选项（.amain），保持"回车=确认主选项"的既有行为
      if (card !== apprSel.card) {
        apprSel.card = card;
        var mainIdx = 0;
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].classList.contains('amain')) { mainIdx = i; break; }
        }
        setApprovalFocus(btns, mainIdx);
        return;
      }
      if (e.defaultPrevented) return;
      var idx = apprSel.idx;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var step = e.key === 'ArrowDown' ? 1 : -1;
        setApprovalFocus(btns, (idx + step + btns.length) % btns.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (idx >= 0 && idx < btns.length) btns[idx].click();
      }
    }, true);
  }

  // 关闭打开的菜单（与原生行为一致：菜单有约 400ms 退场动画）
  // 注意：禁用 Escape 键方案——kimi web 里 Escape 是"停止AI"快捷键，会误杀 agent！
  function closeMenu() {
    // 方法1：点击触发按钮（⋯），安全切换菜单开闭
    var btn = document.querySelector('.ch-act-more');
    if (btn) btn.click();
    // 方法2：兜底——若 150ms 后菜单仍开着，模拟点击菜单外部触发关闭
    setTimeout(function () {
      if (document.querySelector('.ui-menu.ch-menu')) {
        document.body.click();
      }
    }, 150);
  }

  function init() {
    // 启动/刷新即全宽（不读取旧状态，始终以全宽开始；会话内可切换）
    setMode(true);
    // 审批卡片回车确认
    bindEnterApproval();
    // 页面动态渲染，用观察器保证菜单项持续注入
    var obs = new MutationObserver(function () {
      injectMenuItem();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
