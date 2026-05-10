import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const REPO_COMMIT_URL =
  'https://github.com/romanzrespicio/portfolio/commit/';

async function loadData() {
  return d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        url: REPO_COMMIT_URL + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: true,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const fileLineMaxes = d3.rollups(
    data,
    (v) => d3.max(v, (x) => x.line),
    (d) => d.file,
  );
  const maxLinesInFile = d3.max(fileLineMaxes, (d) => d[1]);

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  const rows = [
    ['Commits', commits.length],
    ['Files', d3.group(data, (d) => d.file).size],
    [
      'Total <abbr title="Lines of code">LOC</abbr>',
      data.length,
      true,
    ],
    ['Max depth', d3.max(data, (d) => d.depth)],
    ['Longest line', d3.max(data, (d) => d.length)],
    ['Max lines', maxLinesInFile],
  ];

  for (const row of rows) {
    const [label, value, isHtml] = row;
    const dt = dl.append('dt');
    if (isHtml) dt.html(label);
    else dt.text(label);
    dl.append('dd').text(value);
  }
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const timeEl = document.getElementById('commit-time');
  const authorEl = document.getElementById('commit-author');
  const linesEl = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  timeEl.textContent = commit.time ?? '';
  authorEl.textContent = commit.author ?? '';
  linesEl.textContent = String(commit.totalLines ?? '');
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const offset = 12;
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY + offset}px`;
}

function renderScatterPlot(_data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 44 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .nice()
    .range([usableArea.left, usableArea.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const linesExtent = d3.extent(commits, (d) => d.totalLines);
  let lo = linesExtent[0] ?? 0;
  let hi = linesExtent[1] ?? lo;
  if (hi <= lo) hi = lo + 1;

  const rScale = d3.scaleSqrt().domain([lo, hi]).range([2, 30]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width),
  );

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const dots = svg.append('g').attr('class', 'dots');

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[xa, ya], [xb, yb]] = selection;
    const xmin = Math.min(xa, xb);
    const xmax = Math.max(xa, xb);
    const ymin = Math.min(ya, yb);
    const ymax = Math.max(ya, yb);
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return cx >= xmin && cx <= xmax && cy >= ymin && cy <= ymax;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const countElement = document.querySelector('#selection-count');
    countElement.textContent =
      selectedCommits.length === 0
        ? 'No commits selected'
        : `${selectedCommits.length} commit${selectedCommits.length === 1 ? '' : 's'} selected`;
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );

    container.replaceChildren();
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
      const dt = document.createElement('dt');
      dt.textContent = language;
      const dd = document.createElement('dd');
      dd.textContent = `${count} lines (${formatted})`;
      container.append(dt, dd);
    }
  }

  function brushed(event) {
    const selection = event.selection;
    dots
      .selectAll('circle')
      .classed('selected', (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).attr('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).attr('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on('start brush end', brushed);

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

const data = await loadData();
const commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
