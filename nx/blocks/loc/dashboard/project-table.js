import { LitElement, html, css } from '../../../deps/lit/lit-core.min.js';

class ProjectTable extends LitElement {
  static properties = { projects: { type: Array } };

  static styles = css`
    /* Add table styles here */
  `;

  render() {
    return html`
      <table>
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Created By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${this.projects.map(
    (project) => html`
              <tr>
                <td>${project.name}</td>
                <td>${project.createdBy}</td>
                <td>${project.createdOn}</td>
              </tr>
            `,
  )}
        </tbody>
      </table>
    `;
  }
}

customElements.define('nx-projects-table', ProjectTable);
