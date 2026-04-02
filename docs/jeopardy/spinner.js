// ── UT360 Service Design Jeopardy — Press Your Luck Spinner (D3) ──

var Spinner = (function() {
  'use strict';

  var squares = [];
  var displaySquares = [];  // 18 squares on the board
  var currentHighlight = 0;
  var spinning = false;
  var timer = null;
  var speed = 60;       // ms between highlights
  var stopping = false;
  var result = null;

  function init(pylSquares) {
    squares = pylSquares;
    displaySquares = [];
    result = null;
    stopping = false;
    spinning = false;
    currentHighlight = 0;

    // Build 18 display squares from weighted pool
    var pool = [];
    squares.forEach(function(sq) {
      for (var i = 0; i < (sq.weight || 1); i++) {
        pool.push(sq);
      }
    });

    // Shuffle and fill 18 slots
    for (var i = 0; i < 18; i++) {
      var pick = pool[Math.floor(Math.random() * pool.length)];
      displaySquares.push({
        label: pick.label,
        type: pick.type,
        idx: i
      });
    }

    renderBoard();
  }

  function renderBoard() {
    var container = document.getElementById('pyl-board');
    container.innerHTML = '';

    displaySquares.forEach(function(sq, i) {
      var el = document.createElement('div');
      el.className = 'pyl-square';
      el.id = 'pyl-sq-' + i;

      if (sq.type === 'whammy') {
        el.classList.add('whammy');
        el.innerHTML = '<span style="font-size:1.2em">&#x1f4a5;</span><br>' + sq.label;
      } else if (sq.type === 'multiplier') {
        el.classList.add('bonus');
        el.innerHTML = '<span style="font-size:1.2em">&#x2728;</span><br>' + sq.label;
      } else {
        el.classList.add('bonus');
        el.textContent = sq.label;
      }

      container.appendChild(el);
    });
  }

  function start() {
    spinning = true;
    stopping = false;
    speed = 60;
    result = null;

    clearAllHighlights();
    cycle();
    SFX.play('pylStart');
  }

  function cycle() {
    if (!spinning) return;

    clearAllHighlights();
    currentHighlight = (currentHighlight + 1) % displaySquares.length;

    var el = document.getElementById('pyl-sq-' + currentHighlight);
    if (el) el.classList.add('highlight');

    SFX.play('pylTick');

    if (stopping) {
      speed += 15;
      if (speed > 400) {
        // Stopped
        spinning = false;
        result = displaySquares[currentHighlight];

        // Flash the result
        if (result.type === 'whammy') {
          el.classList.add('whammy-hit');
        } else {
          el.classList.add('result-hit');
        }
        return;
      }
    }

    timer = setTimeout(cycle, speed);
  }

  function stop() {
    if (!spinning) return result;
    stopping = true;
    // Result will be determined when speed decays enough
    return result; // May be null; game.js waits for animation
  }

  // Called by game.js after delay to get final result
  function getResult() {
    return result;
  }

  function clearAllHighlights() {
    displaySquares.forEach(function(_, i) {
      var el = document.getElementById('pyl-sq-' + i);
      if (el) {
        el.classList.remove('highlight');
        el.classList.remove('result-hit');
        el.classList.remove('whammy-hit');
      }
    });
  }

  function destroy() {
    clearTimeout(timer);
    spinning = false;
  }

  return {
    init: init,
    start: start,
    stop: function() {
      stopping = true;
      // Return result after spinner decelerates
      return new Promise(function(resolve) {
        var check = setInterval(function() {
          if (!spinning && result) {
            clearInterval(check);
            resolve(result);
          }
        }, 100);
        // Safety timeout
        setTimeout(function() {
          clearInterval(check);
          if (!result) {
            result = displaySquares[currentHighlight];
          }
          spinning = false;
          resolve(result);
        }, 5000);
      });
    },
    getResult: getResult,
    destroy: destroy
  };
})();
