import { LitElement, html, css } from '../../../deps/lit/lit-core.min.js';

class NxFilterBar extends LitElement {
  static properties = {
    searchQuery: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    translationStatuses: { type: Array },
    rolloutStatuses: { type: Array },
  };

  constructor() {
    super();
    this.searchQuery = '';
    this.startDate = null;
    this.endDate = null;
    this.translationStatuses = ['Error', 'Completed', 'Created', 'In Progress'];
    this.rolloutStatuses = ['Error', 'Completed', 'Rollout Ready', 'In Progress'];
  }

  handleFilterChange() {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: {
          searchQuery: this.searchQuery,
          startDate: this.startDate,
          endDate: this.endDate,
        },
      }),
    );
  }

  render() {
    return html`
      <div class="filter-bar">
        <!-- Search Bar -->
        <input
          type="text"
          class="search-input"
          placeholder="Search projects..."
          .value=${this.searchQuery}
          @input=${(e) => {
    this.searchQuery = e.target.value;
    this.handleFilterChange();
  }}
        />

        <!-- Date Range Filters -->
        <input
          type="date"
          class="date-picker"
          @change=${(e) => {
    this.startDate = e.target.value;
    this.handleFilterChange();
  }}
        />
        <span>to</span>
        <input
          type="date"
          class="date-picker"
          @change=${(e) => {
    this.endDate = e.target.value;
    this.handleFilterChange();
  }}
        />
      </div>
    `;
  }
}

customElements.define('nx-filter-bar', NxFilterBar);
