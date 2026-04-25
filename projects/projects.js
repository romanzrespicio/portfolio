import { fetchJSON, renderProjects } from '../global.js';

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

try {
  const projects = await fetchJSON('../lib/projects.json');

  projectsTitle.textContent = `${projects.length} Projects`;
  renderProjects(projects, projectsContainer, 'h2');
} catch {
  projectsTitle.textContent = 'Projects';
  projectsContainer.textContent =
    'Could not load projects data. Make sure you are viewing the site via a server (not a file:// URL) and that lib/projects.json exists.';
}

