import { html, LitElement } from '../../../deps/lit/lit-core.min.js';
import { getConfig } from '../../../scripts/nexter.js';
import getStyle from '../../../utils/styles.js';
import { daFetch } from '../../../utils/daFetch.js';
import { loadIms } from '../../../utils/ims.js';
import './pagination.js';
import './filter-bar.js';
import './project-table.js';
import './header.js';

const { nxBase } = getConfig();
const style = await getStyle(import.meta.url);
const buttons = await getStyle(`${nxBase}/styles/buttons.js`);
let imsDetails;
let loggedinUser;

class NxLocDashboard extends LitElement {
  static properties = {
    _view: { attribute: false },
    _projects: { attribute: false },
    _currentPage: { attribute: false },
    _siteBase: { attribute: false },
    _filteredProjects: { attribute: false },
    _loading: { attribute: false },
    selectedOrg: { type: String },
    selectedSite: { type: String },
  };

  constructor() {
    super();
    this._projects = [];
    this._filteredProjects = [];
    this._currentPage = 1;
    this._projectsPerPage = 50;
    this._loading = true;
    this.selectedOrg = '';
    this.selectedSite = '';
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style, buttons];
    this.initializeFromHash();
    await this.getProjects();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  // Extract org and site from the hash and set them as initial values
  initializeFromHash() {
    const hash = window.location.hash.slice(2); // Remove the '#' at the start
    if (hash) {
      const [org, site] = hash.split('/');
      this.selectedOrg = org || '';
      this.selectedSite = site || '';
    }
  }

  handleOrgChange(event) {
    this.selectedOrg = event.detail.org;
    // this.updateHash();
    // Additional logic for org change, if needed
  }

  handleSiteChange(event) {
    this.selectedSite = event.detail.site;
    this.updateHash();
    // Additional logic for site change, if needed
  }

  updateHash() {
    const orgPart = this.selectedOrg ? this.selectedOrg : '';
    const sitePart = this.selectedSite ? `/${this.selectedSite}` : '';
    window.location.hash = `#/${orgPart}${sitePart}`;
  }

  startCreateView() {
    console.log('create view called');
    this._view = 'create';
  }

  // Apply filters
  applyFilters(filters) {
    const {
      searchQuery,
      startDate,
      endDate,
      selectedTranslationStatuses,
      selectedRolloutStatuses,
      viewAllProjects,
    } = filters;

    this._filteredProjects = this._projects.filter((project) => {
      // Match search query
      const matchesSearch = searchQuery
        ? project.title.toLowerCase().includes(searchQuery?.toLowerCase())
        : true;

      // Match date range
      const projectDate = new Date(project.createdOn);
      const matchesDate = (!startDate || projectDate >= new Date(startDate))
                && (!endDate || projectDate <= new Date(endDate));

      // Match translation statuses
      const matchesTranslationStatus = selectedTranslationStatuses?.length === 0
                || selectedTranslationStatuses?.includes(project.translationStatus);

      // Match rollout statuses
      const matchesRolloutStatus = selectedRolloutStatuses?.length === 0
                || selectedRolloutStatuses?.includes(project.rolloutStatus);

      // Match ownership statuses
      const matchesOwnership = viewAllProjects || project.createdBy === loggedinUser;

      // Combine all filters
      // eslint-disable-next-line max-len
      return matchesSearch && matchesDate && matchesTranslationStatus && matchesRolloutStatus && matchesOwnership;
    });

    // Reset to the first page after applying filters
    this._currentPage = 1;
  }

  getProjectStatuses(langs) {
    if (!langs || !Array.isArray(langs) || langs.length === 0) {
      return { translationStatus: 'No Languages', rolloutStatus: 'No Languages' };
    }

    const translationStatuses = langs.map((lang) => lang.translation?.status?.toLowerCase());
    const rolloutStatuses = langs.map((lang) => lang.rollout?.status?.toLowerCase());

    // Derive translation status
    let translationStatus;
    if (translationStatuses.some((status) => status === 'error')) {
      translationStatus = 'Error';
    } else if (translationStatuses.every((status) => status === 'complete')) {
      translationStatus = 'Completed';
    } else if (translationStatuses.every((status) => status === 'created')) {
      translationStatus = 'Created';
    } else if (translationStatuses.some((status) => status === 'in-progress')) {
      translationStatus = 'In Progress';
    } else {
      translationStatus = 'Unknown';
    }

    // Derive rollout status
    let rolloutStatus;
    if (rolloutStatuses.some((status) => status === 'error')) {
      rolloutStatus = 'Error';
    } else if (rolloutStatuses.every((status) => status === 'complete')) {
      rolloutStatus = 'Completed';
    } else if (rolloutStatuses.some((status) => status === 'ready')) {
      rolloutStatus = 'Rollout Ready';
    } else if (rolloutStatuses.some((status) => status === 'in-progress')) {
      rolloutStatus = 'In Progress';
    } else {
      rolloutStatus = 'Unknown';
    }

    return { translationStatus, rolloutStatus };
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true, // Use 12-hour format
    };

    // Format using Intl.DateTimeFormat
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    return formattedDate.replace(',', '');
  }

  async getProjectDetails(path) {
    const resp = await daFetch(`https://admin.da.live/versionlist${path}`);
    const json = await resp.json();
    if (json.length === 0) return 'anonymous';
    const oldestVersion = json.pop();
    const createdBy = oldestVersion?.users[0]?.email?.split('@')[0];
    // const createdOn = new Date(oldestVersion?.timestamp);
    const createdOn = this.formatTimestamp(oldestVersion?.timestamp);
    return { createdBy, createdOn };
  }

  async getProjects() {
    try {
      imsDetails = await loadIms();
      loggedinUser = imsDetails?.email?.split('@')[0];
      const siteBase = window.location.hash.replace('#', '');
      this._siteBase = siteBase?.slice(1);
      const resp = await daFetch(`https://admin.da.live/list${siteBase}/.da/translation/projects/active`);
      if (!resp.ok) return;
      const projectList = await resp.json();
      this._projects = await Promise.all(projectList.map(async (project) => {
        const projResp = await daFetch(`https://admin.da.live/source${project.path}`);
        const projJson = await projResp.json();
        project.title = projJson.title;
        const { createdBy, createdOn } = await this.getProjectDetails(project.path);
        project.languages = projJson.langs?.map((lang) => lang.name).join(', ');
        const { translationStatus, rolloutStatus } = this.getProjectStatuses(projJson.langs);
        return {
          title: project.title || 'Untitled',
          path: project.path,
          createdBy: createdBy || 'anonymous',
          createdOn: createdOn || 'unknown',
          languages: (project.languages || 'unknown'),
          translationStatus: translationStatus || 'unknown',
          rolloutStatus: rolloutStatus || 'unknown',
        };
      }));
      this._filteredProjects = [...this._projects];
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      this._loading = false;
    }
  }

  handlePagination(e) {
    this._currentPage = e.detail.page;
  }

  getPaginatedProjects() {
    const start = (this._currentPage - 1) * this._projectsPerPage;
    const end = start + this._projectsPerPage;
    return this._filteredProjects.slice(start, end);
  }

  navigateToProject(path) {
    window.location.hash = `#${path?.replace('.json', '')}`; // Update the URL hash
  }

  renderSpinner() {
    return html`
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>`;
  }

  renderProjects() {
    const paginatedProjects = this.getPaginatedProjects();
    return html`
      <nx-projects-table .projects=${paginatedProjects} @navigate-to-project=${(e) => this.navigateToProject(e.detail.path)}></nx-projects-table>
      <nx-pagination .currentPage=${this._currentPage} .totalItems=${this._filteredProjects.length} .itemsPerPage=${this._projectsPerPage} @page-change=${this.handlePagination}></nx-pagination>`;
  }

  getMainContent() {
    let content;
    if (this._loading) {
      // Show the spinner when loading
      content = this.renderSpinner();
    } else if (this._filteredProjects.length > 0) {
      // Show the projects table if projects are available
      content = this.renderProjects();
    } else {
      // Show a "No projects found" message if there are no projects
      content = html`<p>No projects found.</p>`;
    }
    return content;
  }

  render() {
    return html`
      ${this._view !== 'create' ? html`
        <nx-dashboard-header @create=${(e) => this.startCreateView()}
                             .selectedOrg=${this.selectedOrg}
                             .selectedSite=${this.selectedSite}
                             @org-change=${this.handleOrgChange}
                             @site-change=${this.handleSiteChange}>
        </nx-dashboard-header>
        <nx-filter-bar @filter-change=${(e) => this.applyFilters(e.detail)}></nx-filter-bar>
        ${this.getMainContent()}`
    : html`<nx-loc-setup></nx-loc-setup>`}`;
  }
}

customElements.define('nx-loc-dashboard', NxLocDashboard);
