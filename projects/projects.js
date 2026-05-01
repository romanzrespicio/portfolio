import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let query = '';
let selectedYear = null;

function filterProjects(projects, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return projects;
  }
  return projects.filter((project) => {
    const blob = Object.values(project)
      .map((v) => (v == null ? '' : String(v)))
      .join('\n')
      .toLowerCase();
    return blob.includes(q);
  });
}

function renderPieChart(projectsGiven) {
  const plotRoot = document.querySelector('#projects-plot, #projects-pie-plot');
  if (!plotRoot) {
    console.error(
      'Pie chart SVG missing: expected #projects-plot (or legacy #projects-pie-plot).',
    );
    return;
  }

  const svg = d3.select(plotRoot);
  const legend = d3.select('.legend');
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const withYear = projectsGiven.filter((p) => p.year != null && p.year !== '');
  const rolledData = d3.rollups(
    withYear,
    (v) => v.length,
    (d) => d.year,
  );
  rolledData.sort((a, b) => Number(a[0]) - Number(b[0]));

  const data = rolledData.map(([year, count]) => ({
    value: count,
    label: String(year),
  }));

  if (data.length === 0) {
    legend.selectAll('li').remove();
    svg
      .selectAll('path')
      .transition()
      .duration(320)
      .ease(d3.easeCubicIn)
      .attrTween('d', function (d) {
        if (!d) return () => '';
        const mid = (d.startAngle + d.endAngle) / 2;
        const collapsed = { ...d, startAngle: mid, endAngle: mid };
        const i = d3.interpolate(d, collapsed);
        return (t) => arcGenerator(i(t));
      })
      .remove();
    return;
  }

  const sliceGenerator = d3.pie().value((d) => d.value).sort(null);
  const arcData = sliceGenerator(data);

  const previousByLabel = new Map();
  svg.selectAll('path').each(function (d) {
    if (d?.data?.label != null) {
      previousByLabel.set(String(d.data.label), {
        startAngle: d.startAngle,
        endAngle: d.endAngle,
      });
    }
  });

  svg
    .selectAll('path')
    .data(arcData, (d) => d.data.label)
    .join(
      (enter) =>
        enter
          .append('path')
          .attr('fill', (d) =>
            colors(arcData.findIndex((x) => x.data.label === d.data.label)),
          )
          .attr('data-year', (d) => d.data.label)
          .attr('opacity', 1)
          .attr('stroke', 'white')
          .attr('stroke-width', 0.025)
          .each(function (d) {
            const mid = (d.startAngle + d.endAngle) / 2;
            const collapsed = { ...d, startAngle: mid, endAngle: mid };
            d3.select(this).attr('d', arcGenerator(collapsed));
          })
          .call((sel) =>
            sel
              .transition()
              .duration(480)
              .ease(d3.easeCubicInOut)
              .attrTween('d', function (d) {
                const mid = (d.startAngle + d.endAngle) / 2;
                const from = { ...d, startAngle: mid, endAngle: mid };
                const i = d3.interpolate(from, d);
                return (t) => arcGenerator(i(t));
              }),
          ),
      (update) =>
        update
          .attr('fill', (d) =>
            colors(arcData.findIndex((x) => x.data.label === d.data.label)),
          )
          .attr('data-year', (d) => d.data.label)
          .attr('stroke', 'white')
          .attr('stroke-width', 0.025)
          .call((sel) =>
            sel
              .transition()
              .duration(480)
              .ease(d3.easeCubicInOut)
              .attrTween('d', function (d) {
                const label = String(d.data.label);
                const prev = previousByLabel.get(label);
                const from = prev
                  ? { ...d, startAngle: prev.startAngle, endAngle: prev.endAngle }
                  : d;
                const i = d3.interpolate(from, d);
                return (t) => arcGenerator(i(t));
              }),
          ),
      (exit) =>
        exit
          .transition()
          .duration(360)
          .ease(d3.easeCubicIn)
          .attrTween('d', function (d) {
            const mid = (d.startAngle + d.endAngle) / 2;
            const collapsed = { ...d, startAngle: mid, endAngle: mid };
            const i = d3.interpolate(d, collapsed);
            return (t) => arcGenerator(i(t));
          })
          .remove(),
    );

  legend
    .selectAll('li')
    .data(data, (d) => d.label)
    .join(
      (enter) =>
        enter
          .append('li')
          .attr('class', 'legend-item')
          .attr('data-year', (d) => d.label)
          .style('opacity', 0)
          .attr('style', (d) =>
            `--color:${colors(data.findIndex((x) => x.label === d.label))}`,
          )
          .html(
            (d) =>
              `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`,
          )
          .call((sel) =>
            sel.transition().duration(320).ease(d3.easeCubicOut).style('opacity', 1),
          ),
      (update) =>
        update
          .attr('style', (d) =>
            `--color:${colors(data.findIndex((x) => x.label === d.label))}`,
          )
          .html(
            (d) =>
              `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`,
          ),
      (exit) =>
        exit.transition().duration(220).style('opacity', 0).remove(),
    );

  svg.selectAll('path').on('click', null);
  legend.selectAll('.legend-item').on('click', null);

  svg.selectAll('path').on('click', (_, d) => {
    const y = String(d.data.label);
    selectedYear = selectedYear === y ? null : y;
    updateProjectViews();
  });

  legend.selectAll('.legend-item').on('click', (_, d) => {
    const y = String(d.label);
    selectedYear = selectedYear === y ? null : y;
    updateProjectViews();
  });

  svg
    .selectAll('path')
    .classed(
      'selected',
      (d) => selectedYear !== null && String(d.data.label) === selectedYear,
    );

  legend
    .selectAll('.legend-item')
    .classed(
      'selected',
      (d) => selectedYear !== null && String(d.label) === selectedYear,
    );
}

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchBar = document.querySelector('.searchBar');

let allProjects = [];

function projectsAfterSearch() {
  return filterProjects(allProjects, query);
}

function projectsForPie() {
  const searched = projectsAfterSearch();
  if (selectedYear == null) {
    return searched;
  }
  return searched.filter((p) => String(p.year) === selectedYear);
}

function projectsForList() {
  return projectsForPie();
}

function updateProjectViews() {
  const searched = projectsAfterSearch();
  if (
    selectedYear != null &&
    !searched.some((p) => String(p.year) === selectedYear)
  ) {
    selectedYear = null;
  }

  const list = projectsForList();
  projectsTitle.textContent = `${list.length} Projects`;
  renderPieChart(projectsForPie());
  renderProjects(list, projectsContainer, 'h2');
}

try {
  allProjects = await fetchJSON('../lib/projects.json');

  updateProjectViews();

  function onSearchBarUpdate(event) {
    query = event.target.value;
    updateProjectViews();
  }
  searchBar?.addEventListener('input', onSearchBarUpdate);
  searchBar?.addEventListener('change', onSearchBarUpdate);
} catch {
  projectsTitle.textContent = 'Projects';
  projectsContainer.textContent =
    'Could not load projects data. Make sure you are viewing the site via a server (not a file:// URL) and that lib/projects.json exists.';
  const plotRoot = document.querySelector('#projects-plot, #projects-pie-plot');
  if (plotRoot) {
    d3.select(plotRoot).selectAll('path').remove();
  }
  d3.select('.legend').selectAll('li').remove();
}
