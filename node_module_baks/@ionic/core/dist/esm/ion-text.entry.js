import { r as registerInstance, h, H as Host } from './index-e806d1f6.js';
import { b as getIonMode } from './ionic-global-9d5c8ee3.js';
import { c as createColorClasses } from './theme-ff3fc52f.js';

const textCss = ":host(.ion-color){color:var(--ion-color-base)}";

const Text = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
  }
  render() {
    const mode = getIonMode(this);
    return (h(Host, { class: createColorClasses(this.color, {
        [mode]: true,
      }) }, h("slot", null)));
  }
};
Text.style = textCss;

export { Text as ion_text };
