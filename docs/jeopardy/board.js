// ── OUT OF SERVICE — Board Renderer (D3) ──

var Board = (function() {
  'use strict';

  var TEAM_COLORS = ['#00fff7', '#ff00ff', '#ffd700', '#33ff66', '#ff6b35', '#4466ff'];

  // Wreck-It Ralph inspired blocky pixel characters (16x20 viewBox)
  // Each is a mini SVG drawing function to create distinct chunky characters
  function drawAvatar(svg, index, color, size) {
    svg.setAttribute('viewBox', '0 0 16 20');
    svg.setAttribute('width', size || 32);
    svg.setAttribute('height', (size || 32) * 1.25);
    svg.style.imageRendering = 'pixelated';

    var characters = [
      // Character 0: "The Tank" — big boxy body, tiny legs (Ralph-esque)
      function(s, c) {
        rect(s, 5, 0, 6, 2, c);        // hair
        rect(s, 4, 2, 8, 4, '#ffb380'); // face
        rect(s, 6, 3, 1, 1, '#0a0a0f'); // left eye
        rect(s, 9, 3, 1, 1, '#0a0a0f'); // right eye
        rect(s, 7, 5, 2, 1, '#0a0a0f'); // mouth
        rect(s, 3, 6, 10, 6, c);        // big body
        rect(s, 6, 8, 4, 1, '#fff');    // belt
        rect(s, 2, 7, 2, 4, '#ffb380'); // left arm
        rect(s, 12, 7, 2, 4, '#ffb380');// right arm
        rect(s, 4, 12, 3, 4, '#333');   // left leg
        rect(s, 9, 12, 3, 4, '#333');   // right leg
        rect(s, 4, 16, 3, 2, '#8B4513');// left shoe
        rect(s, 9, 16, 3, 2, '#8B4513');// right shoe
      },
      // Character 1: "The Hacker" — tall, thin, hoodie
      function(s, c) {
        rect(s, 5, 0, 6, 1, c);         // hood top
        rect(s, 4, 1, 8, 2, c);         // hood
        rect(s, 5, 3, 6, 3, '#ffb380'); // face
        rect(s, 6, 4, 1, 1, '#0a0a0f'); // left eye
        rect(s, 9, 4, 1, 1, '#0a0a0f'); // right eye
        rect(s, 7, 5, 2, 1, '#666');    // mouth (smirk)
        rect(s, 4, 6, 8, 6, c);         // hoodie body
        rect(s, 6, 8, 4, 2, '#333');    // laptop
        rect(s, 7, 8, 2, 1, '#00fff7'); // screen glow
        rect(s, 3, 7, 2, 4, c);         // left sleeve
        rect(s, 11, 7, 2, 4, c);        // right sleeve
        rect(s, 5, 12, 2, 4, '#222');   // left leg
        rect(s, 9, 12, 2, 4, '#222');   // right leg
        rect(s, 5, 16, 2, 2, '#555');   // left shoe
        rect(s, 9, 16, 2, 2, '#555');   // right shoe
      },
      // Character 2: "The Bureaucrat" — suit, tie, clipboard
      function(s, c) {
        rect(s, 5, 0, 6, 2, '#333');    // hair
        rect(s, 4, 2, 8, 4, '#ffb380'); // face
        rect(s, 6, 3, 1, 1, '#0a0a0f'); // left eye
        rect(s, 9, 3, 1, 1, '#0a0a0f'); // right eye
        rect(s, 5, 4, 1, 1, '#0a0a0f'); // glasses L
        rect(s, 10, 4, 1, 1, '#0a0a0f');// glasses R
        rect(s, 7, 5, 2, 1, '#0a0a0f'); // mouth
        rect(s, 4, 6, 8, 6, '#444');    // suit
        rect(s, 7, 6, 2, 5, c);         // tie
        rect(s, 2, 7, 3, 5, '#444');    // left arm
        rect(s, 11, 7, 3, 5, '#444');   // right arm
        rect(s, 12, 7, 2, 4, '#fff');   // clipboard
        rect(s, 5, 12, 2, 4, '#333');   // left leg
        rect(s, 9, 12, 2, 4, '#333');   // right leg
        rect(s, 5, 16, 2, 2, '#222');   // left shoe
        rect(s, 9, 16, 2, 2, '#222');   // right shoe
      },
      // Character 3: "The Artist" — beret, paint splatter
      function(s, c) {
        rect(s, 4, 0, 8, 1, c);         // beret
        rect(s, 5, 1, 7, 1, c);         // beret brim
        rect(s, 4, 2, 8, 4, '#c68642'); // face (darker skin)
        rect(s, 6, 3, 1, 1, '#0a0a0f'); // left eye
        rect(s, 9, 3, 1, 1, '#0a0a0f'); // right eye
        rect(s, 7, 5, 2, 1, '#fff');    // smile
        rect(s, 4, 6, 8, 6, '#222');    // smock
        rect(s, 5, 7, 2, 2, '#ff3333');  // paint spot 1
        rect(s, 9, 8, 2, 2, '#00fff7'); // paint spot 2
        rect(s, 7, 10, 2, 1, '#ffd700');// paint spot 3
        rect(s, 2, 7, 3, 4, '#c68642'); // left arm
        rect(s, 11, 7, 3, 4, '#c68642');// right arm
        rect(s, 1, 8, 2, 3, '#ffd700'); // paintbrush
        rect(s, 5, 12, 2, 4, '#555');   // left leg
        rect(s, 9, 12, 2, 4, '#555');   // right leg
        rect(s, 5, 16, 2, 2, c);        // left shoe
        rect(s, 9, 16, 2, 2, c);        // right shoe
      },
      // Character 4: "The Robot" — boxy head, antenna
      function(s, c) {
        rect(s, 7, 0, 2, 2, '#aaa');    // antenna
        rect(s, 4, 2, 8, 5, '#888');    // head
        rect(s, 5, 3, 2, 2, c);         // left eye (glowing)
        rect(s, 9, 3, 2, 2, c);         // right eye (glowing)
        rect(s, 6, 6, 4, 1, '#555');    // mouth grill
        rect(s, 4, 7, 8, 5, '#777');    // body
        rect(s, 6, 8, 4, 2, c);         // chest light
        rect(s, 2, 8, 3, 4, '#888');    // left arm
        rect(s, 11, 8, 3, 4, '#888');   // right arm
        rect(s, 2, 11, 2, 2, '#666');   // left claw
        rect(s, 12, 11, 2, 2, '#666');  // right claw
        rect(s, 5, 12, 2, 4, '#666');   // left leg
        rect(s, 9, 12, 2, 4, '#666');   // right leg
        rect(s, 4, 16, 3, 2, '#555');   // left foot
        rect(s, 9, 16, 3, 2, '#555');   // right foot
      },
      // Character 5: "The Wizard" — pointy hat, staff
      function(s, c) {
        rect(s, 7, 0, 2, 1, c);         // hat tip
        rect(s, 6, 1, 4, 1, c);         // hat mid
        rect(s, 5, 2, 6, 1, c);         // hat base
        rect(s, 4, 3, 8, 1, c);         // hat brim
        rect(s, 5, 4, 6, 3, '#ffb380'); // face
        rect(s, 6, 5, 1, 1, '#0a0a0f'); // left eye
        rect(s, 9, 5, 1, 1, '#0a0a0f'); // right eye
        rect(s, 6, 6, 4, 1, '#ccc');    // beard
        rect(s, 4, 7, 8, 5, '#5533aa');  // robe
        rect(s, 6, 9, 4, 1, '#ffd700'); // belt
        rect(s, 2, 8, 3, 4, '#5533aa'); // left sleeve
        rect(s, 11, 8, 3, 4, '#5533aa');// right sleeve
        rect(s, 1, 7, 1, 8, '#8B4513'); // staff
        rect(s, 0, 6, 3, 2, '#ffd700'); // staff orb
        rect(s, 5, 12, 2, 4, '#5533aa');// left robe
        rect(s, 9, 12, 2, 4, '#5533aa');// right robe
        rect(s, 5, 16, 2, 2, '#333');   // left shoe
        rect(s, 9, 16, 2, 2, '#333');   // right shoe
      }
    ];

    characters[index % characters.length](svg, color);
  }

  function rect(parent, x, y, w, h, fill) {
    var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', w);
    r.setAttribute('height', h);
    r.setAttribute('fill', fill);
    parent.appendChild(r);
  }

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
      avatarSvg.style.display = 'block';
      avatarSvg.style.margin = '0 auto 0.2rem';
      drawAvatar(avatarSvg, i, TEAM_COLORS[i % TEAM_COLORS.length], 28);
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
    updateScores: updateScores,
    drawAvatar: drawAvatar,
    TEAM_COLORS: TEAM_COLORS
  };
})();
