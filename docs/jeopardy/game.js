// ── UT360 Service Design Jeopardy — Game Engine ──

var Game = (function() {
  'use strict';

  var state = {
    screen: 'setup',
    teams: [],
    data: null,
    board: [],          // 2D array of {used, dailyDouble}
    currentClue: null,   // {catIdx, clueIdx, value, question, answer, dailyDouble}
    activeTeamIdx: null,  // team that buzzed in
    wrongTeams: [],       // teams that got it wrong this round
    timerInterval: null,
    timerSeconds: 30,
    dailyDoubleIndices: [],
    pylActive: false,
    pylTeamIdx: null,
    pylEarnedPoints: 0,
    muted: false,
    questionsRemaining: 0
  };

  // ── Screens ──
  function showScreen(name) {
    state.screen = name;
    document.querySelectorAll('.screen').forEach(function(el) {
      el.classList.remove('active');
    });
    var screen = document.getElementById('screen-' + name);
    if (screen) screen.classList.add('active');
  }

  // ── Team Setup ──
  function initSetup() {
    var addBtn = document.getElementById('btn-add-team');
    var removeBtn = document.getElementById('btn-remove-team');
    var startBtn = document.getElementById('btn-start');

    addBtn.addEventListener('click', function() {
      var inputs = document.getElementById('team-inputs');
      var count = inputs.children.length;
      if (count >= 6) return;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'pixel-input';
      inp.placeholder = 'Team ' + (count + 1);
      inp.maxLength = 20;
      inputs.appendChild(inp);
    });

    removeBtn.addEventListener('click', function() {
      var inputs = document.getElementById('team-inputs');
      if (inputs.children.length > 2) {
        inputs.removeChild(inputs.lastChild);
      }
    });

    startBtn.addEventListener('click', function() {
      var inputs = document.querySelectorAll('#team-inputs .pixel-input');
      var teams = [];
      inputs.forEach(function(inp, i) {
        var name = inp.value.trim() || ('Team ' + (i + 1));
        teams.push({ name: name, score: 0 });
      });
      if (teams.length < 2) return;
      state.teams = teams;
      Audio.init();
      loadGame();
    });
  }

  // ── Load Game Data ──
  function loadGame() {
    d3.json('questions.json').then(function(data) {
      state.data = data;
      state.questionsRemaining = data.categories.length * data.categories[0].clues.length;

      // Init board state
      state.board = data.categories.map(function(cat) {
        return cat.clues.map(function() {
          return { used: false, dailyDouble: false };
        });
      });

      // Place daily doubles randomly
      var totalClues = data.categories.length * data.categories[0].clues.length;
      var ddCount = data.dailyDoubles || 2;
      var placed = {};
      while (Object.keys(placed).length < ddCount) {
        var idx = Math.floor(Math.random() * totalClues);
        if (!placed[idx]) {
          var catIdx = Math.floor(idx / data.categories[0].clues.length);
          var clueIdx = idx % data.categories[0].clues.length;
          state.board[catIdx][clueIdx].dailyDouble = true;
          placed[idx] = true;
        }
      }

      showScreen('board');
      Board.render(state.data, state.board, state.teams);
      Audio.play('boardReveal');
    }).catch(function(err) {
      alert('Error loading questions.json — check for JSON syntax errors.\n\n' + err);
    });
  }

  // ── Select a Clue ──
  function selectClue(catIdx, clueIdx) {
    var cat = state.data.categories[catIdx];
    var clue = cat.clues[clueIdx];
    var cell = state.board[catIdx][clueIdx];
    if (cell.used) return;

    cell.used = true;
    state.questionsRemaining--;
    state.wrongTeams = [];
    state.activeTeamIdx = null;

    state.currentClue = {
      catIdx: catIdx,
      clueIdx: clueIdx,
      value: clue.value,
      question: clue.question,
      answer: clue.answer,
      dailyDouble: cell.dailyDouble
    };

    Board.markUsed(catIdx, clueIdx);

    if (cell.dailyDouble) {
      Audio.play('dailyDouble');
      showDailyDouble();
    } else {
      showQuestion();
    }
  }

  // ── Daily Double ──
  function showDailyDouble() {
    // Pick the first team (host will select who controls the board)
    // For simplicity, prompt host to choose
    showScreen('daily-double');
    var ddTeamEl = document.getElementById('dd-team-name');
    // Build team selector
    ddTeamEl.innerHTML = '';
    state.teams.forEach(function(team, i) {
      var btn = document.createElement('button');
      btn.className = 'pixel-btn';
      btn.textContent = team.name;
      btn.style.margin = '0.3rem';
      btn.addEventListener('click', function() {
        state.activeTeamIdx = i;
        ddTeamEl.innerHTML = '<span style="color:var(--cyan)">' + team.name + '</span>';
        var maxWager = Math.max(team.score, 1000);
        document.getElementById('dd-max').textContent = maxWager;
        var input = document.getElementById('dd-wager-input');
        input.max = maxWager;
        input.value = Math.min(500, maxWager);
        input.style.display = '';
        document.getElementById('btn-dd-confirm').style.display = '';
      });
      ddTeamEl.appendChild(btn);
    });
    document.getElementById('dd-wager-input').style.display = 'none';
    document.getElementById('btn-dd-confirm').style.display = 'none';
  }

  function confirmDailyDouble() {
    var wager = parseInt(document.getElementById('dd-wager-input').value) || 0;
    var maxWager = Math.max(state.teams[state.activeTeamIdx].score, 1000);
    wager = Math.max(0, Math.min(wager, maxWager));
    state.currentClue.value = wager;
    state.currentClue.originalValue = wager;
    showQuestion();
  }

  // ── Question Screen ──
  function showQuestion() {
    showScreen('question');
    var clue = state.currentClue;

    document.getElementById('category-label').textContent = state.data.categories[clue.catIdx].name;
    document.getElementById('value-label').textContent = '$' + clue.value;
    document.getElementById('question-text').textContent = clue.question;

    // Host-only answer preview (tiny, nearly invisible on screen share)
    var hostAnswer = document.getElementById('host-answer');
    hostAnswer.textContent = 'HOST: ' + clue.answer;

    var answerEl = document.getElementById('answer-text');
    answerEl.textContent = clue.answer;
    answerEl.classList.add('hidden');

    document.getElementById('btn-reveal').classList.remove('hidden');
    document.getElementById('btn-no-answer').classList.remove('hidden');

    // Team buzzers
    var buzzerContainer = document.getElementById('team-buzzers');
    buzzerContainer.innerHTML = '';

    if (clue.dailyDouble && state.activeTeamIdx !== null) {
      // Only the DD team can answer
      var team = state.teams[state.activeTeamIdx];
      var btn = document.createElement('button');
      btn.className = 'buzzer-btn';
      btn.textContent = team.name;
      btn.addEventListener('click', function() {
        handleBuzz(state.activeTeamIdx);
      });
      buzzerContainer.appendChild(btn);
    } else {
      state.teams.forEach(function(team, i) {
        var btn = document.createElement('button');
        btn.className = 'buzzer-btn';
        btn.textContent = team.name;
        btn.dataset.teamIdx = i;
        btn.addEventListener('click', function() {
          handleBuzz(i);
        });
        buzzerContainer.appendChild(btn);
      });
    }

    startTimer();
    Audio.play('clueReveal');
  }

  // ── Timer ──
  function startTimer() {
    var seconds = state.timerSeconds;
    var fill = document.getElementById('timer-fill');
    fill.style.width = '100%';
    fill.className = 'timer-fill';

    clearInterval(state.timerInterval);
    var elapsed = 0;
    state.timerInterval = setInterval(function() {
      elapsed++;
      var pct = Math.max(0, 100 - (elapsed / seconds * 100));
      fill.style.width = pct + '%';

      if (pct < 20) {
        fill.className = 'timer-fill danger';
      } else if (pct < 40) {
        fill.className = 'timer-fill warning';
      }

      if (elapsed >= seconds) {
        clearInterval(state.timerInterval);
        Audio.play('timeUp');
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  // ── Buzz In ──
  function handleBuzz(teamIdx) {
    if (state.wrongTeams.indexOf(teamIdx) !== -1) return;
    state.activeTeamIdx = teamIdx;

    // Highlight the buzzed team
    var buttons = document.querySelectorAll('.buzzer-btn');
    buttons.forEach(function(btn) {
      btn.style.borderColor = '';
    });
    buttons.forEach(function(btn) {
      if (parseInt(btn.dataset.teamIdx) === teamIdx || (state.currentClue.dailyDouble && state.activeTeamIdx === teamIdx)) {
        btn.style.borderColor = 'var(--cyan)';
        btn.style.boxShadow = '0 0 15px rgba(0,255,247,0.4)';
      }
    });

    // Show correct/wrong buttons
    showJudgeButtons(teamIdx);
  }

  function showJudgeButtons(teamIdx) {
    var actions = document.querySelector('.question-actions');
    // Clear existing judge buttons
    var existing = actions.querySelectorAll('.judge-btn');
    existing.forEach(function(b) { b.remove(); });

    var correctBtn = document.createElement('button');
    correctBtn.className = 'pixel-btn correct judge-btn';
    correctBtn.textContent = 'CORRECT';
    correctBtn.addEventListener('click', function() { judgeAnswer(true); });

    var wrongBtn = document.createElement('button');
    wrongBtn.className = 'pixel-btn danger judge-btn';
    wrongBtn.textContent = 'WRONG';
    wrongBtn.addEventListener('click', function() { judgeAnswer(false); });

    actions.insertBefore(wrongBtn, actions.firstChild);
    actions.insertBefore(correctBtn, actions.firstChild);
  }

  // ── Judge Answer ──
  function judgeAnswer(correct) {
    var teamIdx = state.activeTeamIdx;
    var clue = state.currentClue;
    stopTimer();

    // Remove judge buttons
    document.querySelectorAll('.judge-btn').forEach(function(b) { b.remove(); });

    if (correct) {
      state.teams[teamIdx].score += clue.value;
      Board.updateScores(state.teams);
      Audio.play('correct');
      revealAnswer();

      // Offer Press Your Luck (not on daily doubles to keep it simpler)
      if (!clue.dailyDouble) {
        setTimeout(function() {
          offerPYL(teamIdx, clue.value);
        }, 1500);
      } else {
        setTimeout(returnToBoard, 2500);
      }
    } else {
      // Wrong — deduct half value
      var penalty = Math.floor(clue.value / 2);
      state.teams[teamIdx].score -= penalty;
      Board.updateScores(state.teams);
      Audio.play('wrong');

      // Mark team as wrong
      state.wrongTeams.push(teamIdx);
      var buttons = document.querySelectorAll('.buzzer-btn');
      buttons.forEach(function(btn) {
        if (parseInt(btn.dataset.teamIdx) === teamIdx) {
          btn.classList.add('wrong');
        }
      });

      // If daily double or all teams wrong, reveal and move on
      if (clue.dailyDouble || state.wrongTeams.length >= state.teams.length) {
        revealAnswer();
        setTimeout(returnToBoard, 2500);
      }
      // Otherwise, other teams can still buzz in
    }
  }

  function revealAnswer() {
    var answerEl = document.getElementById('answer-text');
    answerEl.classList.remove('hidden');
    document.getElementById('btn-reveal').classList.add('hidden');
    document.getElementById('btn-no-answer').classList.add('hidden');
  }

  function noAnswer() {
    stopTimer();
    revealAnswer();
    Audio.play('timeUp');
    setTimeout(returnToBoard, 2500);
  }

  // ── Press Your Luck ──
  function offerPYL(teamIdx, earnedPoints) {
    state.pylTeamIdx = teamIdx;
    state.pylEarnedPoints = earnedPoints;
    showScreen('pyl');

    document.getElementById('pyl-team-name').textContent = state.teams[teamIdx].name;
    document.getElementById('pyl-points-at-stake').textContent = state.teams[teamIdx].score;
    document.getElementById('pyl-result').classList.add('hidden');
    document.getElementById('btn-pyl-stop').classList.remove('hidden');
    document.getElementById('btn-pyl-bank').classList.remove('hidden');

    Spinner.init(state.data.pylSquares);
    Spinner.start();
  }

  function pylStop() {
    document.getElementById('btn-pyl-stop').classList.add('hidden');
    document.getElementById('btn-pyl-bank').classList.add('hidden');

    Spinner.stop().then(function(result) {
      setTimeout(function() {
        applyPYLResult(result);
      }, 500);
    });
  }

  function pylBank() {
    Spinner.destroy();
    document.getElementById('btn-pyl-stop').classList.add('hidden');
    document.getElementById('btn-pyl-bank').classList.add('hidden');

    var resultEl = document.getElementById('pyl-result');
    resultEl.textContent = 'BANKED! Safe play.';
    resultEl.className = 'pyl-result bonus-result';
    resultEl.classList.remove('hidden');

    Audio.play('correct');
    setTimeout(returnToBoard, 1500);
  }

  function applyPYLResult(square) {
    var resultEl = document.getElementById('pyl-result');
    resultEl.classList.remove('hidden');
    var team = state.teams[state.pylTeamIdx];

    if (square.type === 'whammy') {
      var lost = Math.floor(team.score / 2);
      team.score -= lost;
      resultEl.textContent = 'WHAMMY! Lost $' + lost + '!';
      resultEl.className = 'pyl-result whammy-result';
      Audio.play('whammy');

      // Screen shake
      var container = document.querySelector('.game-container');
      container.classList.add('screen-shake');
      setTimeout(function() { container.classList.remove('screen-shake'); }, 500);
    } else if (square.type === 'multiplier') {
      var bonus = team.score;
      team.score *= 2;
      resultEl.textContent = '2x SCORE! +$' + bonus + '!';
      resultEl.className = 'pyl-result bonus-result';
      Audio.play('bigWin');
    } else {
      var pts = parseInt(square.label.replace('+', ''));
      team.score += pts;
      resultEl.textContent = square.label + ' BONUS!';
      resultEl.className = 'pyl-result bonus-result';
      Audio.play('correct');
    }

    Board.updateScores(state.teams);
    setTimeout(returnToBoard, 2500);
  }

  // ── Return to Board ──
  function returnToBoard() {
    state.currentClue = null;
    state.activeTeamIdx = null;
    state.wrongTeams = [];

    if (state.questionsRemaining <= 0) {
      endGame();
    } else {
      showScreen('board');
      Board.render(state.data, state.board, state.teams);
    }
  }

  // ── End Game ──
  function endGame() {
    showScreen('gameover');
    Audio.play('fanfare');

    // Find winner
    var maxScore = -Infinity;
    var winner = '';
    state.teams.forEach(function(t) {
      if (t.score > maxScore) {
        maxScore = t.score;
        winner = t.name;
      }
    });

    document.getElementById('winner-announce').textContent = winner + ' WINS WITH $' + maxScore + '!';

    // D3 bar chart
    renderFinalChart();
    launchConfetti();
  }

  function renderFinalChart() {
    var svg = d3.select('#final-chart');
    svg.selectAll('*').remove();

    var container = svg.node().parentElement;
    var width = Math.min(container.offsetWidth - 40, 700);
    var height = 280;
    svg.attr('width', width).attr('height', height);

    var margin = { top: 20, right: 20, bottom: 50, left: 20 };
    var w = width - margin.left - margin.right;
    var h = height - margin.top - margin.bottom;

    var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var x = d3.scaleBand().domain(state.teams.map(function(t) { return t.name; })).range([0, w]).padding(0.3);
    var maxVal = d3.max(state.teams, function(t) { return Math.max(t.score, 100); });
    var y = d3.scaleLinear().domain([0, maxVal]).range([h, 0]);

    var colors = ['#00fff7', '#ff00ff', '#ffd700', '#33ff66', '#ff6b35', '#4466ff'];

    g.selectAll('.bar')
      .data(state.teams)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', function(t) { return x(t.name); })
      .attr('y', h)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', function(_, i) { return colors[i % colors.length]; })
      .transition()
      .delay(function(_, i) { return i * 300; })
      .duration(800)
      .ease(d3.easeBounceOut)
      .attr('y', function(t) { return y(Math.max(0, t.score)); })
      .attr('height', function(t) { return h - y(Math.max(0, t.score)); });

    g.selectAll('.bar-label')
      .data(state.teams)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', function(t) { return x(t.name) + x.bandwidth() / 2; })
      .attr('y', function(t) { return y(Math.max(0, t.score)) - 8; })
      .attr('fill', '#e8e8e8')
      .attr('font-family', "'Press Start 2P', monospace")
      .attr('font-size', '0.6rem')
      .text(function(t) { return '$' + t.score; })
      .attr('opacity', 0)
      .transition()
      .delay(function(_, i) { return i * 300 + 800; })
      .duration(300)
      .attr('opacity', 1);

    g.selectAll('.name-label')
      .data(state.teams)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', function(t) { return x(t.name) + x.bandwidth() / 2; })
      .attr('y', h + 20)
      .attr('fill', '#888')
      .attr('font-family', "'Press Start 2P', monospace")
      .attr('font-size', '0.4rem')
      .text(function(t) { return t.name; });
  }

  function launchConfetti() {
    var colors = ['#00fff7', '#ff00ff', '#ffd700', '#33ff66', '#ff3333', '#4466ff'];
    var container = document.getElementById('confetti-container');
    container.innerHTML = '';

    for (var i = 0; i < 60; i++) {
      (function(delay) {
        setTimeout(function() {
          var piece = document.createElement('div');
          piece.className = 'confetti-piece';
          piece.style.left = Math.random() * 100 + 'vw';
          piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          piece.style.animationDuration = (2 + Math.random() * 3) + 's';
          piece.style.animationDelay = '0s';
          container.appendChild(piece);
          setTimeout(function() { piece.remove(); }, 5000);
        }, delay);
      })(i * 50);
    }
  }

  // ── Scoreboard Screen ──
  function showScoreboard() {
    showScreen('scoreboard');
    var container = document.getElementById('scoreboard-teams');
    container.innerHTML = '';

    var TEAM_COLORS = ['#00fff7', '#ff00ff', '#ffd700', '#33ff66', '#ff6b35', '#4466ff'];
    var AVATARS = [
      'M4,2h4v1h1v3h-1v1h-2v1h-2v-1h-2v-1h-1v-3h1v-1z',
      'M3,2h6v1h1v2h-1v1h-1v1h-4v-1h-1v-1h-1v-2h1v-1z',
      'M4,1h4v1h1v1h1v2h-1v1h-1v1h-4v-1h-1v-1h-1v-2h1v-1h1v-1z',
      'M3,3h1v-1h1v-1h2v1h1v1h1v2h-1v1h-1v1h-2v-1h-1v-1h-1v-2z',
      'M2,3h2v-2h4v2h2v2h-2v2h-4v-2h-2v-2z',
      'M4,1h4v2h1v2h-1v2h-2v1h-2v-1h-2v-2h-1v-2h1v-2z'
    ];

    var maxScore = -Infinity;
    state.teams.forEach(function(t) { if (t.score > maxScore) maxScore = t.score; });

    state.teams.forEach(function(team, i) {
      var card = document.createElement('div');
      card.className = 'sb-team';
      if (team.score === maxScore && maxScore > 0) card.classList.add('leader');

      // Big pixel avatar
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '64');
      svg.setAttribute('height', '56');
      svg.setAttribute('viewBox', '0 0 12 10');
      svg.setAttribute('class', 'sb-avatar');

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', AVATARS[i % AVATARS.length]);
      path.setAttribute('fill', TEAM_COLORS[i % TEAM_COLORS.length]);
      svg.appendChild(path);

      var eye1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      eye1.setAttribute('x', '4'); eye1.setAttribute('y', '3');
      eye1.setAttribute('width', '1'); eye1.setAttribute('height', '1');
      eye1.setAttribute('fill', '#0a0a0f');
      svg.appendChild(eye1);

      var eye2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      eye2.setAttribute('x', '7'); eye2.setAttribute('y', '3');
      eye2.setAttribute('width', '1'); eye2.setAttribute('height', '1');
      eye2.setAttribute('fill', '#0a0a0f');
      svg.appendChild(eye2);

      card.appendChild(svg);

      var name = document.createElement('div');
      name.className = 'sb-name';
      name.textContent = team.name;
      card.appendChild(name);

      var score = document.createElement('div');
      score.className = 'sb-score';
      if (team.score < 0) score.classList.add('negative');
      score.textContent = '$' + team.score;
      card.appendChild(score);

      container.appendChild(card);
    });
  }

  // ── Keyboard Shortcuts ──
  function initKeyboard() {
    document.addEventListener('keydown', function(e) {
      // M = mute
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
        return;
      }
      // F = fullscreen
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }

      // S = scoreboard toggle (from board or scoreboard)
      if (e.key === 's' || e.key === 'S') {
        if (state.screen === 'board') {
          showScoreboard();
          return;
        } else if (state.screen === 'scoreboard') {
          showScreen('board');
          Board.render(state.data, state.board, state.teams);
          return;
        }
      }

      if (state.screen === 'question') {
        // Space = reveal answer
        if (e.code === 'Space') {
          e.preventDefault();
          if (document.getElementById('answer-text').classList.contains('hidden')) {
            revealAnswer();
          }
        }
        // 1-6 = team buzz
        var num = parseInt(e.key);
        if (num >= 1 && num <= state.teams.length) {
          handleBuzz(num - 1);
        }
        // Escape = back to board (skip question)
        if (e.key === 'Escape') {
          stopTimer();
          returnToBoard();
        }
      }

      if (state.screen === 'scoreboard') {
        if (e.key === 'Escape') {
          showScreen('board');
          Board.render(state.data, state.board, state.teams);
        }
      }

      if (state.screen === 'pyl') {
        if (e.code === 'Space') {
          e.preventDefault();
          pylStop();
        }
        if (e.key === 'Escape') {
          pylBank();
        }
      }
    });
  }

  function toggleMute() {
    state.muted = !state.muted;
    Audio.setMute(state.muted);
    var btn = document.getElementById('btn-mute');
    btn.textContent = state.muted ? '\u{1f507}' : '\u{1f50a}';
    btn.classList.toggle('muted', state.muted);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function() {});
    } else {
      document.exitFullscreen();
    }
  }

  // ── Init ──
  function init() {
    initSetup();
    initKeyboard();

    document.getElementById('btn-reveal').addEventListener('click', function() {
      revealAnswer();
      stopTimer();
    });
    document.getElementById('btn-no-answer').addEventListener('click', noAnswer);
    document.getElementById('btn-dd-confirm').addEventListener('click', confirmDailyDouble);
    document.getElementById('btn-pyl-stop').addEventListener('click', pylStop);
    document.getElementById('btn-pyl-bank').addEventListener('click', pylBank);
    document.getElementById('btn-mute').addEventListener('click', toggleMute);
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
    document.getElementById('btn-scoreboard').addEventListener('click', showScoreboard);
    document.getElementById('btn-back-to-board').addEventListener('click', function() {
      showScreen('board');
      Board.render(state.data, state.board, state.teams);
    });
    document.getElementById('btn-end-game').addEventListener('click', endGame);
    document.getElementById('btn-play-again').addEventListener('click', function() {
      window.location.reload();
    });
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    selectClue: selectClue,
    getTeams: function() { return state.teams; },
    getState: function() { return state; }
  };
})();
