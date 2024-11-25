import { LitElement, html } from '../../../deps/lit/lit-core.min.js';
import getStyle from '../../../utils/styles.js';
import { getConfig } from '../../../scripts/nexter.js';

const { nxBase } = getConfig();
const style = await getStyle(import.meta.url);
const buttons = await getStyle(`${nxBase}/styles/buttons.js`);

class ToggleSwitch extends LitElement {
  static properties = {
    checked: { type: Boolean },
    allLabel: { type: String },
    myLabel: { type: String },
  };

  constructor() {
    super();
    this.checked = false;
    this.allLabel = 'All Projects'; // Default label for "All"
    this.myLabel = 'My Projects'; // Default label for "My"
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style, buttons];
  }

  handleToggle(event) {
    this.checked = event.target.checked;
    this.dispatchEvent(new CustomEvent('toggle-change', { detail: { checked: this.checked } }));
  }

  render() {
    return html`
        <div class="toggle-switch">
            <label>
                <input type="checkbox" .checked=${this.checked} @change=${this.handleToggle}/>
                <span class="slider"></span>
                <span class="toggle-label">${this.checked ? this.allLabel : this.myLabel}</span>
            </label>
        </div>
    `;
  }
}

customElements.define('nx-toggle-switch', ToggleSwitch);
