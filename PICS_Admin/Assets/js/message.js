// message.js - creates a modal-like message card (success/error/info)
// Usage: showMessage({ type: 'success'|'error'|'info', title, text, buttonText, autoCloseMs, onClose })

(function () {
  // Ensure single instance
  if (window.__GM_LOADED) return;
  window.__GM_LOADED = true;

  // Create DOM structure when needed
  function ensureDOM() {
    let root = document.getElementById('gm-root-backdrop');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'gm-root-backdrop';
    root.className = 'gm-backdrop';
    root.style.display = 'none'; // hidden until shown

    // inner card
    root.innerHTML = `
      <div class="gm-card" role="dialog" aria-modal="true">
        <div class="gm-icon-wrap">
          <div class="gm-icon" id="gm-icon-svg"></div>
        </div>
        <div class="gm-body">
          <h3 class="gm-title" id="gm-title">Title</h3>
          <p class="gm-text" id="gm-text">Text</p>
          <div style="margin-top:8px;">
            <button class="gm-btn" id="gm-action-btn">Continue</button>
          </div>
        </div>
        <div class="gm-close" id="gm-close" title="Close">&times;</div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function svgForType(type) {
    if (type === 'success') {
      return `<svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.285 6.709a1 1 0 0 0-1.414-1.418l-8.97 8.99-3.89-3.9a1 1 0 0 0-1.414 1.414l4.597 4.608a1 1 0 0 0 1.414 0l9.667-9.704z"/>
              </svg>`;
    } else if (type === 'error') {
      return `<svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.001 10h2v5h-2zm0 7h2v2h-2z"/><path d="M1 21h22L12 2 1 21z"/>
              </svg>`;
    } else {
      // info
      return `<svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 9h2V7h-2zm0 8h2v-6h-2z"/><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
              </svg>`;
    }
  }

  // showMessage API
  window.showMessage = function (options) {
    if (!options) options = {};
    const type = options.type || 'success'; // success | error | info
    const title = options.title || (type === 'success' ? 'Success' : type === 'error' ? 'Failed' : 'Notice');
    const text = options.text || '';
    const buttonText = options.buttonText || (type === 'success' ? 'Continue' : type === 'error' ? 'Try Again' : 'OK');
    const autoCloseMs = typeof options.autoCloseMs === 'number' ? options.autoCloseMs : null;
    const onClose = typeof options.onClose === 'function' ? options.onClose : null;
    const showCloseX = options.showCloseX === false ? false : true;

    const root = ensureDOM();
    const iconWrap = root.querySelector('#gm-icon-svg');
    const titleEl = root.querySelector('#gm-title');
    const textEl = root.querySelector('#gm-text');
    const btn = root.querySelector('#gm-action-btn');
    const closeEl = root.querySelector('#gm-close');

    // set content
    iconWrap.innerHTML = svgForType(type);
    titleEl.textContent = title;
    textEl.textContent = text;
    btn.textContent = buttonText;

    // styling variant
    root.classList.remove('gm-success', 'gm-error', 'gm-info');
    root.classList.add(type === 'success' ? 'gm-success' : type === 'error' ? 'gm-error' : 'gm-info');

    // show
    root.style.display = 'flex';
    // small delay to allow CSS transitions
    requestAnimationFrame(() => root.classList.add('show'));

    // button handler
    const hide = (reason) => {
      root.classList.remove('show');
      setTimeout(() => {
        root.style.display = 'none';
      }, 260);
      if (onClose) try { onClose(reason); } catch (e) { console.error(e); }
    };

    // ensure previous listeners removed
    btn.onclick = () => hide('action');
    closeEl.onclick = () => hide('close');
    closeEl.style.display = showCloseX ? 'flex' : 'none';

    // optional auto close
    if (autoCloseMs) {
      setTimeout(() => hide('auto'), autoCloseMs);
    }

    // allow clicking backdrop to close if option set
    if (options.closeOnBackdrop !== false) {
      root.onclick = (e) => {
        if (e.target === root) hide('backdrop');
      };
    } else {
      root.onclick = null;
    }
  };

  // convenience helpers
  window.showSuccess = (title, text, opts = {}) => showMessage(Object.assign({ type: 'success', title, text }, opts));
  window.showError = (title, text, opts = {}) => showMessage(Object.assign({ type: 'error', title, text }, opts));
  window.showInfo = (title, text, opts = {}) => showMessage(Object.assign({ type: 'info', title, text }, opts));
})();
