'use strict';

const index = require('./index-a35cc20f.js');

const startStatusTap = () => {
  const win = window;
  win.addEventListener('statusTap', () => {
    index.readTask(() => {
      const width = win.innerWidth;
      const height = win.innerHeight;
      const el = document.elementFromPoint(width / 2, height / 2);
      if (!el) {
        return;
      }
      const contentEl = el.closest('ion-content');
      if (contentEl) {
        contentEl.componentOnReady().then(() => {
          index.writeTask(() => contentEl.scrollToTop(300));
        });
      }
    });
  });
};

exports.startStatusTap = startStatusTap;
