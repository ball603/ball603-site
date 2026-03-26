/* Ball603 Audio Player v1.0 */
(function() {
  'use strict';

  var B603AudioPlayer = {
    _audio: null,

    init: function(opts) {
      var audioUrl = opts.audioUrl;
      var container = opts.container;
      if (!audioUrl || !container) return;

      var audio = new Audio(audioUrl);
      this._audio = audio;

      container.innerHTML =
        '<div class="b603-audio-player">' +
          '<button class="b603-audio-play-btn" id="b603PlayBtn" aria-label="Play article audio">' +
            '<svg class="b603-icon-play" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
            '<svg class="b603-icon-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
          '</button>' +
          '<div class="b603-audio-info">' +
            '<div class="b603-audio-label">&#127911; Listen to this article</div>' +
            '<div class="b603-audio-progress-wrap">' +
              '<input type="range" class="b603-audio-progress" id="b603Progress" value="0" min="0" max="100" step="0.1">' +
              '<span class="b603-audio-time" id="b603Time">0:00 / 0:00</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      var playBtn   = container.querySelector('#b603PlayBtn');
      var progress  = container.querySelector('#b603Progress');
      var timeEl    = container.querySelector('#b603Time');

      function fmt(s) {
        s = Math.floor(s || 0);
        return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
      }

      function updateTime() {
        timeEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
        if (audio.duration) {
          progress.value = (audio.currentTime / audio.duration) * 100;
        }
      }

      playBtn.addEventListener('click', function() {
        if (audio.paused) {
          audio.play().then(function() {
            playBtn.classList.add('playing');
          }).catch(function(err) {
            console.error('B603 Audio play error:', err);
            playBtn.classList.remove('playing');
          });
        } else {
          audio.pause();
          playBtn.classList.remove('playing');
        }
      });

      audio.addEventListener('error', function() {
        console.error('B603 Audio load error — URL:', audioUrl);
      });

      progress.addEventListener('input', function() {
        if (audio.duration) {
          audio.currentTime = (progress.value / 100) * audio.duration;
        }
      });

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateTime);
      audio.addEventListener('ended', function() {
        playBtn.classList.remove('playing');
        audio.currentTime = 0;
        updateTime();
      });
    }
  };

  window.B603AudioPlayer = B603AudioPlayer;
})();
