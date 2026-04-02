// ── UT360 Service Design Jeopardy — Audio Engine (Web Audio API) ──

var Audio = (function() {
  'use strict';

  var ctx = null;
  var muted = false;
  var initialized = false;

  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      initialized = true;
    } catch(e) {
      console.warn('Web Audio API not available');
    }
  }

  function setMute(m) { muted = m; }

  function playTone(freq, duration, type, gain, delay) {
    if (!ctx || muted) return;
    type = type || 'square';
    gain = gain || 0.15;
    delay = delay || 0;

    var osc = ctx.createOscillator();
    var vol = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    vol.gain.setValueAtTime(gain, ctx.currentTime + delay);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  function playNoise(duration, gain, delay) {
    if (!ctx || muted) return;
    delay = delay || 0;
    gain = gain || 0.1;

    var bufferSize = ctx.sampleRate * duration;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    var source = ctx.createBufferSource();
    source.buffer = buffer;
    var vol = ctx.createGain();
    vol.gain.setValueAtTime(gain, ctx.currentTime + delay);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    source.connect(vol);
    vol.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  }

  var sounds = {
    boardReveal: function() {
      // Ascending arpeggio
      [261, 329, 392, 523].forEach(function(f, i) {
        playTone(f, 0.15, 'square', 0.12, i * 0.08);
      });
    },

    clueReveal: function() {
      playTone(440, 0.1, 'square', 0.1);
      playTone(554, 0.15, 'square', 0.1, 0.08);
    },

    correct: function() {
      // Happy chord
      playTone(523, 0.3, 'square', 0.1);
      playTone(659, 0.3, 'square', 0.08, 0.05);
      playTone(784, 0.4, 'square', 0.1, 0.1);
    },

    wrong: function() {
      // Descending buzz
      playTone(200, 0.3, 'sawtooth', 0.12);
      playTone(150, 0.4, 'sawtooth', 0.1, 0.15);
    },

    dailyDouble: function() {
      // Dramatic drum roll (noise bursts) + rising tone
      for (var i = 0; i < 8; i++) {
        playNoise(0.05, 0.15, i * 0.07);
      }
      playTone(440, 0.2, 'square', 0.12, 0.6);
      playTone(660, 0.2, 'square', 0.12, 0.7);
      playTone(880, 0.4, 'square', 0.15, 0.8);
    },

    timeUp: function() {
      playTone(300, 0.5, 'sawtooth', 0.1);
      playTone(200, 0.6, 'sawtooth', 0.08, 0.3);
    },

    pylStart: function() {
      [330, 392, 440, 523, 587, 659].forEach(function(f, i) {
        playTone(f, 0.1, 'square', 0.08, i * 0.06);
      });
    },

    pylTick: function() {
      playTone(800, 0.03, 'square', 0.06);
    },

    whammy: function() {
      // Sad descending
      playTone(400, 0.2, 'sawtooth', 0.15);
      playTone(350, 0.2, 'sawtooth', 0.12, 0.2);
      playTone(300, 0.2, 'sawtooth', 0.1, 0.4);
      playTone(200, 0.5, 'sawtooth', 0.15, 0.6);
      playNoise(0.3, 0.12, 0.8);
    },

    bigWin: function() {
      // Fanfare
      [523, 659, 784, 1047].forEach(function(f, i) {
        playTone(f, 0.3, 'square', 0.1, i * 0.12);
      });
      playTone(1047, 0.6, 'square', 0.12, 0.5);
    },

    fanfare: function() {
      // Victory fanfare
      var notes = [523, 523, 523, 698, 880, 784, 880, 1047];
      var durs = [0.15, 0.15, 0.15, 0.3, 0.15, 0.15, 0.15, 0.6];
      var time = 0;
      notes.forEach(function(f, i) {
        playTone(f, durs[i], 'square', 0.12, time);
        time += durs[i] * 0.8;
      });
    }
  };

  function play(name) {
    if (!initialized) init();
    if (sounds[name]) {
      try {
        sounds[name]();
      } catch(e) {
        // Silently fail
      }
    }
  }

  return {
    init: init,
    play: play,
    setMute: setMute
  };
})();
