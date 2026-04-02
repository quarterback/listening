// ── OUT OF SERVICE — Game Engine ──

var Game = (function() {
  'use strict';

  var state = {
    screen: 'title',
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
      SFX.init();
      loadGame();
    });
  }

  // ── Load Game Data ──
  function loadGame() {
    d3.json('questions.json').then(function(data) {
      // Randomly pick 6 categories from the pool
      var allCats = data.categories.slice();
      var picked = [];
      while (picked.length < 6 && allCats.length > 0) {
        var idx = Math.floor(Math.random() * allCats.length);
        picked.push(allCats.splice(idx, 1)[0]);
      }
      data.categories = picked;
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
      SFX.play('boardReveal');
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
      image: clue.image || null,
      dailyDouble: cell.dailyDouble
    };

    Board.markUsed(catIdx, clueIdx);

    if (cell.dailyDouble) {
      SFX.play('dailyDouble');
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

    var questionEl = document.getElementById('question-text');
    questionEl.innerHTML = '';

    // If clue has an image, show it
    var rawClue = state.data.categories[clue.catIdx].clues[clue.clueIdx];
    if (rawClue.image) {
      var img = document.createElement('img');
      img.src = rawClue.image;
      img.alt = 'Identify this';
      img.className = 'clue-image';
      questionEl.appendChild(img);
      if (clue.question) {
        var txt = document.createElement('div');
        txt.textContent = clue.question;
        txt.style.marginTop = '0.75rem';
        questionEl.appendChild(txt);
      }
    } else {
      questionEl.textContent = clue.question;
    }


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
    SFX.play('clueReveal');
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
        SFX.play('timeUp');
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
      SFX.play('correct');
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
      SFX.play('wrong');

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
    SFX.play('timeUp');
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

    SFX.play('correct');
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
      SFX.play('whammy');

      // Screen shake
      var container = document.querySelector('.game-container');
      container.classList.add('screen-shake');
      setTimeout(function() { container.classList.remove('screen-shake'); }, 500);
    } else if (square.type === 'multiplier') {
      var bonus = team.score;
      team.score *= 2;
      resultEl.textContent = '2x SCORE! +$' + bonus + '!';
      resultEl.className = 'pyl-result bonus-result';
      SFX.play('bigWin');
    } else {
      var pts = parseInt(square.label.replace('+', ''));
      team.score += pts;
      resultEl.textContent = square.label + ' BONUS!';
      resultEl.className = 'pyl-result bonus-result';
      SFX.play('correct');
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
      startFinalJeopardy();
    } else {
      showScreen('board');
      Board.render(state.data, state.board, state.teams);
    }
  }

  // ── Final Jeopardy ──
  function startFinalJeopardy() {
    var finals = state.data.finalJeopardy;
    if (!finals || finals.length === 0) {
      endGame();
      return;
    }

    // Pick a random Final Jeopardy clue
    var fj = finals[Math.floor(Math.random() * finals.length)];
    state.finalClue = fj;
    state.finalWagers = [];

    showScreen('final');
    SFX.play('dailyDouble');

    document.getElementById('final-category').textContent = fj.category;

    // Show wager phase
    document.getElementById('final-wager-phase').style.display = '';
    document.getElementById('final-clue-phase').style.display = 'none';
    document.getElementById('final-judge-phase').style.display = 'none';

    // Build wager inputs for each team
    var grid = document.getElementById('final-wager-inputs');
    grid.innerHTML = '';
    state.teams.forEach(function(team, i) {
      var card = document.createElement('div');
      card.className = 'final-wager-card';

      var name = document.createElement('div');
      name.className = 'fw-name';
      name.textContent = team.name;
      card.appendChild(name);

      var score = document.createElement('div');
      score.className = 'fw-score';
      score.textContent = 'Score: $' + team.score;
      card.appendChild(score);

      var input = document.createElement('input');
      input.type = 'number';
      input.className = 'pixel-input';
      input.min = 0;
      input.max = Math.max(team.score, 0);
      input.value = 0;
      input.dataset.teamIdx = i;
      card.appendChild(input);

      grid.appendChild(card);
    });
  }

  function lockFinalWagers() {
    var inputs = document.querySelectorAll('#final-wager-inputs input');
    state.finalWagers = [];
    inputs.forEach(function(inp, i) {
      var maxW = Math.max(state.teams[i].score, 0);
      var wager = Math.max(0, Math.min(parseInt(inp.value) || 0, maxW));
      state.finalWagers.push(wager);
    });

    // Move to clue phase
    document.getElementById('final-wager-phase').style.display = 'none';
    document.getElementById('final-clue-phase').style.display = '';
    document.getElementById('final-question-text').textContent = state.finalClue.question;
    SFX.play('clueReveal');

    // Start a 60-second timer for Final Jeopardy
    startFinalTimer();
  }

  function startFinalTimer() {
    var seconds = 60;
    var fill = document.getElementById('final-timer-fill');
    fill.style.width = '100%';
    fill.className = 'timer-fill';
    clearInterval(state.timerInterval);
    var elapsed = 0;
    state.timerInterval = setInterval(function() {
      elapsed++;
      var pct = Math.max(0, 100 - (elapsed / seconds * 100));
      fill.style.width = pct + '%';
      if (pct < 20) fill.className = 'timer-fill danger';
      else if (pct < 40) fill.className = 'timer-fill warning';
      if (elapsed >= seconds) {
        clearInterval(state.timerInterval);
        SFX.play('timeUp');
      }
    }, 1000);
  }

  function revealFinalAndJudge() {
    clearInterval(state.timerInterval);

    document.getElementById('final-clue-phase').style.display = 'none';
    document.getElementById('final-judge-phase').style.display = '';
    document.getElementById('final-answer-text').textContent = state.finalClue.answer;

    var container = document.getElementById('final-judge-teams');
    container.innerHTML = '';

    state.teams.forEach(function(team, i) {
      var card = document.createElement('div');
      card.className = 'fj-team-card';
      card.id = 'fj-card-' + i;

      var name = document.createElement('div');
      name.className = 'fj-name';
      name.textContent = team.name;
      card.appendChild(name);

      var wager = document.createElement('div');
      wager.className = 'fj-wager';
      wager.textContent = 'Wagered: $' + state.finalWagers[i];
      card.appendChild(wager);

      var buttons = document.createElement('div');
      buttons.className = 'fj-buttons';

      var correctBtn = document.createElement('button');
      correctBtn.className = 'pixel-btn correct';
      correctBtn.textContent = 'CORRECT';
      correctBtn.addEventListener('click', function() {
        judgeFinalTeam(i, true);
      });

      var wrongBtn = document.createElement('button');
      wrongBtn.className = 'pixel-btn danger';
      wrongBtn.textContent = 'WRONG';
      wrongBtn.addEventListener('click', function() {
        judgeFinalTeam(i, false);
      });

      buttons.appendChild(correctBtn);
      buttons.appendChild(wrongBtn);
      card.appendChild(buttons);

      container.appendChild(card);
    });
  }

  function judgeFinalTeam(teamIdx, correct) {
    var card = document.getElementById('fj-card-' + teamIdx);
    var wager = state.finalWagers[teamIdx];

    // Remove buttons
    var btns = card.querySelector('.fj-buttons');
    if (btns) btns.remove();

    var result = document.createElement('div');
    result.className = 'fj-result';

    if (correct) {
      state.teams[teamIdx].score += wager;
      card.classList.add('fj-correct');
      result.style.color = 'var(--green)';
      result.textContent = '+$' + wager;
      SFX.play('correct');
    } else {
      state.teams[teamIdx].score -= wager;
      card.classList.add('fj-wrong');
      result.style.color = 'var(--red)';
      result.textContent = '-$' + wager;
      SFX.play('wrong');
    }

    card.appendChild(result);
  }

  // ── End Game ──
  function endGame() {
    showScreen('gameover');
    SFX.play('fanfare');

    // Sort teams by score descending
    var ranked = state.teams.map(function(t, i) {
      return { name: t.name, score: t.score, idx: i };
    }).sort(function(a, b) { return b.score - a.score; });

    renderPodium(ranked);
    renderRankings(ranked);
    launchConfetti();
  }

  function renderPodium(ranked) {
    var area = document.getElementById('podium-area');
    area.innerHTML = '';

    // Podium order: 2nd, 1st, 3rd (like Mario Kart)
    var podiumOrder = [];
    if (ranked.length >= 2) podiumOrder.push({ team: ranked[1], place: 2, height: 100 });
    if (ranked.length >= 1) podiumOrder.push({ team: ranked[0], place: 1, height: 140 });
    if (ranked.length >= 3) podiumOrder.push({ team: ranked[2], place: 3, height: 70 });

    var podium = document.createElement('div');
    podium.className = 'podium';

    podiumOrder.forEach(function(p, i) {
      var col = document.createElement('div');
      col.className = 'podium-col';
      col.style.animationDelay = (i * 0.3) + 's';

      // Character (bouncing on 1st place)
      var charWrap = document.createElement('div');
      charWrap.className = 'podium-char';
      if (p.place === 1) charWrap.classList.add('winner-bounce');

      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      Board.drawAvatar(svg, p.team.idx, Board.TEAM_COLORS[p.team.idx % Board.TEAM_COLORS.length], 56);
      charWrap.appendChild(svg);

      // Crown on 1st place
      if (p.place === 1) {
        var crown = document.createElement('div');
        crown.className = 'podium-crown';
        crown.textContent = '\u{1f451}';
        charWrap.appendChild(crown);
      }

      col.appendChild(charWrap);

      // Name
      var name = document.createElement('div');
      name.className = 'podium-name';
      name.textContent = p.team.name;
      col.appendChild(name);

      // Score
      var score = document.createElement('div');
      score.className = 'podium-score';
      score.textContent = '$' + p.team.score;
      col.appendChild(score);

      // Platform
      var platform = document.createElement('div');
      platform.className = 'podium-platform podium-place-' + p.place;
      platform.style.height = p.height + 'px';

      var placeLabel = document.createElement('div');
      placeLabel.className = 'podium-place-label';
      placeLabel.textContent = p.place === 1 ? '1ST' : p.place === 2 ? '2ND' : '3RD';
      platform.appendChild(placeLabel);

      col.appendChild(platform);
      podium.appendChild(col);
    });

    area.appendChild(podium);
  }

  function renderRankings(ranked) {
    var list = document.getElementById('rankings-list');
    list.innerHTML = '';

    // Show 4th place and below as a simple list
    if (ranked.length <= 3) return;

    for (var i = 3; i < ranked.length; i++) {
      var row = document.createElement('div');
      row.className = 'ranking-row';
      row.style.animationDelay = (0.9 + i * 0.15) + 's';

      var place = document.createElement('span');
      place.className = 'ranking-place';
      place.textContent = (i + 1) + getSuffix(i + 1);

      var charSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      Board.drawAvatar(charSvg, ranked[i].idx, Board.TEAM_COLORS[ranked[i].idx % Board.TEAM_COLORS.length], 24);
      charSvg.style.verticalAlign = 'middle';

      var name = document.createElement('span');
      name.className = 'ranking-name';
      name.textContent = ranked[i].name;

      var score = document.createElement('span');
      score.className = 'ranking-score';
      score.textContent = '$' + ranked[i].score;

      row.appendChild(place);
      row.appendChild(charSvg);
      row.appendChild(name);
      row.appendChild(score);
      list.appendChild(row);
    }
  }

  function getSuffix(n) {
    if (n === 11 || n === 12 || n === 13) return 'TH';
    var last = n % 10;
    if (last === 1) return 'ST';
    if (last === 2) return 'ND';
    if (last === 3) return 'RD';
    return 'TH';
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

    var maxScore = -Infinity;
    state.teams.forEach(function(t) { if (t.score > maxScore) maxScore = t.score; });

    state.teams.forEach(function(team, i) {
      var card = document.createElement('div');
      card.className = 'sb-team';
      if (team.score === maxScore && maxScore > 0) card.classList.add('leader');

      // Big pixel avatar using shared drawAvatar
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'sb-avatar');
      Board.drawAvatar(svg, i, Board.TEAM_COLORS[i % Board.TEAM_COLORS.length], 64);
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

      // G = go to Final Round (from board)
      if ((e.key === 'g' || e.key === 'G') && state.screen === 'board') {
        startFinalJeopardy();
        return;
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
    SFX.setMute(state.muted);
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

    // Title screen → Setup screen
    document.getElementById('btn-title-start').addEventListener('click', function() {
      SFX.init();
      SFX.play('fanfare');
      showScreen('setup');
    });

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
    document.getElementById('btn-final-round').addEventListener('click', startFinalJeopardy);
    document.getElementById('btn-end-game').addEventListener('click', endGame);
    document.getElementById('btn-skip-to-end').addEventListener('click', function() {
      stopTimer();
      startFinalJeopardy();
    });
    document.getElementById('btn-final-lock-wagers').addEventListener('click', lockFinalWagers);
    document.getElementById('btn-final-reveal').addEventListener('click', revealFinalAndJudge);
    document.getElementById('btn-final-finish').addEventListener('click', endGame);
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
