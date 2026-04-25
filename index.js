import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const profileStats = document.querySelector('#profile-stats');
const projectsContainer = document.querySelector('.projects');

try {
  const projects = await fetchJSON('./lib/projects.json');
  const latestProjects = projects.slice(0, 3);
  renderProjects(latestProjects, projectsContainer, 'h2');
} catch {
  if (projectsContainer) {
    projectsContainer.textContent =
      'Could not load projects data. Make sure you are viewing the site via a server (not a file:// URL).';
  }
}

try {
  const githubData = await fetchGitHubData('romanzrespicio');

  if (profileStats) {
    profileStats.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  }
} catch {
  if (profileStats) {
    profileStats.textContent =
      'Could not load GitHub stats right now (API blocked or rate-limited).';
  }
}

