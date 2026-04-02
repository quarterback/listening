// ── UT360 Service Design Jeopardy — Board Renderer (D3) ──

var Board = (function() {
  'use strict';

  var TEAM_COLORS = ['#00fff7', '#ff00ff', '#ffd700', '#33ff66', '#ff6b35', '#4466ff'];
  var TEAM_AVATARS = [
    // Pixel art avatar SVG paths — simple 8-bit style characters
    'M4,2h4v1h1v3h-1v1h-2v1h-2v-1h-2v-1h-1v-3h1v-1z', // blocky face 1
    'M3,2h6v1h1v2h-1v1h-1v1h-4v-1h-1v-1h-1v-2h1v-1z', // blocky face 2
    'M4,1h4v1h1v1h1v2h-1v1h-1v1h-4v-1h-1v-1h-1v-2h1v-1h1v-1z', // round-ish
    'M3,3h1v-1h1v-1h2v1h1v1h1v2h-1v1h-1v1h-2v-1h-1v-1h-1v-2z', // diamond
    'M2,3h2v-2h4v2h2v2h-2v2h-4v-2h-2v-2z', // plus shape
    'M4,1h4v2h1v2h-1v2h-2v1h-2v-1h-2v-2h-1v-2h1v-2z'  // hexagon-ish
  ];

  function render(data, boardState, teams) {
    var container = document.getElementById('board');
    container.innerHTML = '';

    // Render category headers
    data.categories.forEach(function(cat) {
      var header = document.createElement('div');
      header.className = 'board-header';
      header.textContent = cat.name;
      container.appendChild(header);
    });

    // Render cells
    var numClues = data.categories[0].clues.length;
    for (var row = 0; row < numClues; row++) {
      for (var col = 0; col < data.categories.length; col++) {
        (function(c, r) {
          var clue = data.categories[c].clues[r];
          var cell = document.createElement('div');
          cell.className = 'board-cell';
          if (boardState[c][r].used) {
            cell.classList.add('used');
          }
          cell.textContent = boardState[c][r].used ? '' : '$' + clue.value;
          cell.dataset.cat = c;
          cell.dataset.clue = r;

          if (!boardState[c][r].used) {
            cell.addEventListener('click', function() {
              Game.selectClue(c, r);
            });
          }
          container.appendChild(cell);
        })(col, row);
      }
    }

    updateScores(teams);
  }

  function markUsed(catIdx, clueIdx) {
    var cells = document.querySelectorAll('.board-cell');
    cells.forEach(function(cell) {
      if (parseInt(cell.dataset.cat) === catIdx && parseInt(cell.dataset.clue) === clueIdx) {
        cell.classList.add('used');
        cell.textContent = '';
        cell.style.cursor = 'default';
      }
    });
  }

  function updateScores(teams) {
    var scorebar = document.getElementById('scorebar');
    scorebar.innerHTML = '';

    teams.forEach(function(team, i) {
      var item = document.createElement('div');
      item.className = 'score-item';

      // Pixel avatar
      var avatarSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      avatarSvg.setAttribute('width', '28');
      avatarSvg.setAttribute('height', '28');
      avatarSvg.setAttribute('viewBox', '0 0 12 10');
      avatarSvg.style.display = 'block';
      avatarSvg.style.margin = '0 auto 0.2rem';

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', TEAM_AVATARS[i % TEAM_AVATARS.length]);
      path.setAttribute('fill', TEAM_COLORS[i % TEAM_COLORS.length]);
      avatarSvg.appendChild(path);

      // Eyes (2 pixel dots)
      var eye1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      eye1.setAttribute('x', '4'); eye1.setAttribute('y', '3');
      eye1.setAttribute('width', '1'); eye1.setAttribute('height', '1');
      eye1.setAttribute('fill', '#0a0a0f');
      avatarSvg.appendChild(eye1);

      var eye2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      eye2.setAttribute('x', '7'); eye2.setAttribute('y', '3');
      eye2.setAttribute('width', '1'); eye2.setAttribute('height', '1');
      eye2.setAttribute('fill', '#0a0a0f');
      avatarSvg.appendChild(eye2);

      item.appendChild(avatarSvg);

      var nameDiv = document.createElement('div');
      nameDiv.className = 'score-name';
      nameDiv.textContent = team.name;
      item.appendChild(nameDiv);

      var valueDiv = document.createElement('div');
      valueDiv.className = 'score-value';
      valueDiv.textContent = '$' + team.score;
      if (team.score > 0) valueDiv.classList.add('positive');
      if (team.score < 0) valueDiv.classList.add('negative');
      item.appendChild(valueDiv);

      scorebar.appendChild(item);
    });
  }

  return {
    render: render,
    markUsed: markUsed,
    updateScores: updateScores
  };
})();
