import { html, LitElement } from '../../../deps/lit/lit-core.min.js';
import { getConfig } from '../../../scripts/nexter.js';
import getStyle from '../../../utils/styles.js';
import { daFetch } from '../../../utils/daFetch.js';

const { nxBase } = getConfig();
const style = await getStyle(import.meta.url);
const buttons = await getStyle(`${nxBase}/styles/buttons.js`);

class NxDashboardHeader extends LitElement {
  static properties = {
    _orgs: { attribute: false },
    _sites: { attribute: false },
    selectedOrg: { type: String }, // Passed from parent
    selectedSite: { type: String }, // Passed from parent
  };

  constructor() {
    super();
    this._orgs = [];
    this._sites = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style, buttons];
    console.log(`Selected org: ${this.selectedOrg}, Selected site: ${this.selectedSite}`);
    this.loadOrgs(); // Load organizations on component mount

    // If a selectedOrg is passed, load sites for that org
    if (this.selectedOrg) {
      this.loadSites(this.selectedOrg);
    }
  }

  async loadOrgs() {
    try {
      const response = await daFetch('https://admin.da.live/list');
      if (!response.ok) {
        console.error('Failed to fetch organizations');
        return;
      }
      const orgData = await response.json();
      this._orgs = orgData.map((org) => org.name);

      // If a selectedOrg exists and is valid, ensure it's preselected
      if (this.selectedOrg && !this._orgs.includes(this.selectedOrg)) {
        console.warn(`Preselected org "${this.selectedOrg}" is not in the fetched list.`);
        this.selectedOrg = '';
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  }

  async loadSites(org) {
    try {
      const response = await daFetch(`https://admin.da.live/list/${org}`);
      if (!response.ok) {
        console.error('Failed to fetch sites for organization:', org);
        return;
      }
      const sitesData = await response.json();
      this._sites = sitesData.map((site) => site.name);

      // If a selectedSite exists and is valid, ensure it's preselected
      if (this.selectedSite && !this._sites.includes(this.selectedSite)) {
        console.warn(`Preselected site "${this.selectedSite}" is not in the fetched list for org "${org}".`);
        this.selectedSite = '';
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  }

  handleOrgChange(event) {
    this.selectedOrg = event.target.value;
    this.selectedSite = ''; // Reset site when org changes
    this._sites = []; // Clear sites while loading
    if (this.selectedOrg) {
      this.loadSites(this.selectedOrg); // Load sites for the selected org
    }
    this.dispatchEvent(new CustomEvent('org-change', { detail: { org: this.selectedOrg } }));
  }

  handleSiteChange(event) {
    this.selectedSite = event.target.value;
    this.dispatchEvent(new CustomEvent('site-change', { detail: { site: this.selectedSite } }));
  }

  createProjectView() {
    this.dispatchEvent(
      new CustomEvent('create'),
    );
  }

  render() {
    return html`
            <div class="dashboard-header">
                <h1>Dashboard Raghu</h1>
                <div class="dropdown-container">
                    <select @change=${this.handleOrgChange} class="custom-dropdown">
                        <option value="">Select Organization</option>
                        ${this._orgs.map(
    (org) => html`<option value="${org}" ?selected=${org === this.selectedOrg}>${org}</option>`,
  )}
                    </select>
                    <select @change=${this.handleSiteChange} class="custom-dropdown" ?disabled=${!this.selectedOrg}>
                        <option value="">Select Site</option>
                        ${this._sites.map(
    (site) => html`<option value="${site}" ?selected=${site === this.selectedSite}>${site}</option>`,
  )}
                    </select>
                </div>
                <button class="accent" @click=${this.createProjectView}>Create Project</button>
            </div>
        `;
  }
}

customElements.define('nx-dashboard-header', NxDashboardHeader);
