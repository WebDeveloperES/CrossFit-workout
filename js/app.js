/* =========================================================
   CFPA Overlay Builder — application logic
   - UI tab switching and live preview
   - Timer controls, local settings and layout export
   - BroadcastChannel sync with the separate transparent view
   ========================================================= */
(function ($) {
  "use strict";

  const DEFAULTS = {
    timerMode: "countdown", durationMinutes: 12, durationSeconds: 0,
    roundCount: 5, workTime: 40, restTime: 20, colorShift: true,
    soundToggle: false, brandTitle: "CFPA TRAINING CLUB",
    brandSubtitle: "STRENGTH • COMMUNITY • PROGRESS", brandColor: "#c7f36b",
    fontSize: "normal", showLeft: true, showCenter: true, showRight: true,
    showClock: true, workoutTitle: "ENGINE ROOM", coachName: "COACH ALEX",
    infoText: "5 ROUNDS · QUALITY OVER SPEED", logoData: ""
  };

  const $doc = $(document);
  let settings = { ...DEFAULTS };
  let remainingSeconds = 720;
  let elapsedSeconds = 0;
  let timerInterval = null;
  let isRunning = false;
  let activeRound = 1;
  let intervalPhase = "work";
  let channel = null;

  // Connect to the separate overlay tab when the browser supports BroadcastChannel.
  try { channel = new BroadcastChannel("cfpa-overlay-sync"); } catch (error) { channel = null; }

  // Utility: format seconds as MM:SS, allowing minutes over 59.
  function formatTime(total) {
    const safe = Math.max(0, Math.floor(total));
    return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
  }

  // Collect current form values and keep booleans/numbers typed correctly.
  function readSettings() {
    settings.timerMode = $("#timerMode").val();
    settings.durationMinutes = Math.max(0, Number($("#durationMinutes").val()) || 0);
    settings.durationSeconds = Math.min(59, Math.max(0, Number($("#durationSeconds").val()) || 0));
    settings.roundCount = Number($("#roundCount").val()) || 1;
    settings.workTime = Math.max(1, Number($("#workTime").val()) || 40);
    settings.restTime = Math.max(0, Number($("#restTime").val()) || 0);
    settings.colorShift = $("#colorShift").is(":checked");
    settings.soundToggle = $("#soundToggle").is(":checked");
    settings.brandTitle = $("#brandTitle").val().trim() || DEFAULTS.brandTitle;
    settings.brandSubtitle = $("#brandSubtitle").val().trim();
    settings.brandColor = $("#brandColor").val() || DEFAULTS.brandColor;
    settings.fontSize = $("#fontSize").val();
    settings.showLeft = $("#showLeft").is(":checked");
    settings.showCenter = $("#showCenter").is(":checked");
    settings.showRight = $("#showRight").is(":checked");
    settings.showClock = $("#showClock").is(":checked");
    settings.workoutTitle = $("#workoutTitle").val().trim();
    settings.coachName = $("#coachName").val().trim();
    settings.infoText = $("#infoText").val().trim();
    return settings;
  }

  // Publish a compact state object to the transparent output tab.
  function broadcastState() {
    if (!channel) return;
    channel.postMessage({
      settings, remainingSeconds, elapsedSeconds, isRunning, activeRound,
      timerText: currentTimerText(), timerState: timerStateLabel(), intervalPhase
    });
  }

  function currentTimerText() {
    if (settings.timerMode === "stopwatch") return formatTime(elapsedSeconds);
    return formatTime(remainingSeconds);
  }

  function timerStateLabel() {
    if (!isRunning && elapsedSeconds === 0 && remainingSeconds === settings.durationMinutes * 60 + settings.durationSeconds) return "READY TO START";
    if (!isRunning && remainingSeconds === 0 && settings.timerMode !== "stopwatch") return "WORKOUT COMPLETE";
    if (!isRunning) return "PAUSED";
    if (settings.timerMode === "interval") return intervalPhase === "work" ? "WORK" : "REST";
    return settings.timerMode === "stopwatch" ? "ELAPSED TIME" : "WORKOUT IN PROGRESS";
  }

  // Update the editor preview and synchronize the output view.
  function renderPreview() {
    readSettings();
    $("#previewBrandTitle").text(settings.brandTitle);
    $("#previewBrandSubtitle").text(settings.brandSubtitle);
    $("#previewWorkoutTitle").text(settings.workoutTitle);
    $("#previewCoach").text(settings.coachName);
    $("#previewInfo").text(settings.infoText);
    $("#previewTimer").text(currentTimerText());
    $("#timerState").text(timerStateLabel());
    $("#previewRound").text("ROUND " + String(activeRound).padStart(2, "0") + " / " + String(settings.roundCount).padStart(2, "0"));
    $("#roundValue").text(settings.roundCount + (settings.roundCount === 1 ? " Runde" : " Runden"));
    $("#overlayLeft").toggle(settings.showLeft);
    $("#overlayCenter").toggle(settings.showCenter);
    $("#overlayRight").toggle(settings.showRight);
    $("#previewClock").toggle(settings.showClock).text(new Date().toLocaleTimeString("de-DE", { hour12: false }));
    document.documentElement.style.setProperty("--accent", settings.brandColor);
    $("body").removeClass("font-compact font-large").addClass(settings.fontSize === "normal" ? "" : "font-" + settings.fontSize);
    const total = Math.max(1, settings.durationMinutes * 60 + settings.durationSeconds);
    const progress = settings.timerMode === "stopwatch" ? 0 : remainingSeconds / total;
    let timerColor = settings.brandColor;
    if (settings.colorShift && settings.timerMode !== "stopwatch") {
      if (progress <= 0.2) timerColor = "#ff5b52";
      else if (progress <= 0.5) timerColor = "#ffd45b";
    }
    $("#previewTimer").css("color", timerColor);
    if (settings.logoData) {
      $("#uploadedLogo").attr("src", settings.logoData).prop("hidden", false);
      $("#defaultLogo").hide();
    } else {
      $("#uploadedLogo").prop("hidden", true).attr("src", "");
      $("#defaultLogo").show();
    }
    broadcastState();
  }

  // Reset timer state from the current settings.
  function resetTimer() {
    stopTimer();
    readSettings();
    remainingSeconds = settings.durationMinutes * 60 + settings.durationSeconds;
    elapsedSeconds = 0;
    activeRound = 1;
    intervalPhase = "work";
    renderPreview();
    $("#saveStatus").text("Timer zurückgesetzt");
  }

  function stopTimer() {
    if (timerInterval) window.clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
  }

  // Browser-generated tone avoids an external audio dependency.
  function playSignal() {
    if (!settings.soundToggle) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.22);
      oscillator.onended = () => context.close();
    } catch (error) { /* Audio is optional; some browsers require a user gesture. */ }
  }

  // Timer tick. Interval mode alternates work/rest periods and increments rounds.
  function tick() {
    if (settings.timerMode === "stopwatch") {
      elapsedSeconds += 1;
    } else if (settings.timerMode === "interval") {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        playSignal();
        if (intervalPhase === "work") {
          intervalPhase = "rest";
          remainingSeconds = settings.restTime;
        } else {
          activeRound += 1;
          if (activeRound > settings.roundCount) {
            stopTimer();
            remainingSeconds = 0;
          } else {
            intervalPhase = "work";
            remainingSeconds = settings.workTime;
          }
        }
      }
    } else {
      remainingSeconds = Math.max(0, remainingSeconds - 1);
      if (remainingSeconds === 0) {
        stopTimer();
        playSignal();
      }
    }
    renderPreview();
    if (!isRunning && remainingSeconds === 0 && settings.timerMode !== "stopwatch") $("#saveStatus").text("Workout beendet");
  }

  function startTimer() {
    if (isRunning) return;
    readSettings();
    if (settings.timerMode === "countdown" && remainingSeconds <= 0) resetTimer();
    if (settings.timerMode === "interval" && remainingSeconds <= 0) remainingSeconds = settings.workTime;
    isRunning = true;
    timerInterval = window.setInterval(tick, 1000);
    renderPreview();
    $("#saveStatus").text("Timer läuft");
  }

  function pauseTimer() {
    stopTimer();
    renderPreview();
    $("#saveStatus").text("Pausiert");
  }

  // Populate controls from a saved or default settings object.
  function applySettings(data) {
    settings = { ...DEFAULTS, ...data };
    $("#timerMode").val(settings.timerMode);
    $("#durationMinutes").val(settings.durationMinutes);
    $("#durationSeconds").val(settings.durationSeconds);
    $("#roundCount").val(settings.roundCount);
    $("#workTime").val(settings.workTime);
    $("#restTime").val(settings.restTime);
    $("#colorShift").prop("checked", settings.colorShift);
    $("#soundToggle").prop("checked", settings.soundToggle);
    $("#brandTitle").val(settings.brandTitle);
    $("#brandSubtitle").val(settings.brandSubtitle);
    $("#brandColor").val(settings.brandColor);
    $("#fontSize").val(settings.fontSize);
    $("#showLeft").prop("checked", settings.showLeft);
    $("#showCenter").prop("checked", settings.showCenter);
    $("#showRight").prop("checked", settings.showRight);
    $("#showClock").prop("checked", settings.showClock);
    $("#workoutTitle").val(settings.workoutTitle);
    $("#coachName").val(settings.coachName);
    $("#infoText").val(settings.infoText);
    remainingSeconds = settings.durationMinutes * 60 + settings.durationSeconds;
    elapsedSeconds = 0;
    activeRound = 1;
    renderPreview();
  }

  // Tabs switch between the three settings categories.
  $(".control-tab").on("click", function () {
    const tab = $(this).data("tab");
    $(".control-tab").removeClass("active");
    $(this).addClass("active");
    $(".tab-content-panel").removeClass("active");
    $("#tab-" + tab).addClass("active");
  });

  // Any settings change is reflected immediately in the preview.
  $doc.on("input change", ".control-panel input, .control-panel select, .control-panel textarea", function () {
    if (this.id === "durationMinutes" || this.id === "durationSeconds") {
      const duration = (Number($("#durationMinutes").val()) || 0) * 60 + (Number($("#durationSeconds").val()) || 0);
      if (!isRunning) remainingSeconds = duration;
    }
    if (this.id === "timerMode" && !isRunning) {
      elapsedSeconds = 0;
      remainingSeconds = (Number($("#durationMinutes").val()) || 0) * 60 + (Number($("#durationSeconds").val()) || 0);
    }
    renderPreview();
    $("#saveStatus").text("Änderungen aktiv");
  });

  // Logo upload is local to the browser session and embedded as a data URL.
  $("#logoUpload").on("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte eine Bilddatei auswählen."); return; }
    const reader = new FileReader();
    reader.onload = function (loadEvent) {
      settings.logoData = loadEvent.target.result;
      renderPreview();
      $("#saveStatus").text("Logo geladen");
    };
    reader.readAsDataURL(file);
  });

  $("#removeLogoBtn").on("click", function () {
    settings.logoData = "";
    $("#logoUpload").val("");
    renderPreview();
  });

  $("#startBtn").on("click", startTimer);
  $("#pauseBtn").on("click", pauseTimer);
  $("#resetBtn").on("click", resetTimer);

  // Keyboard shortcuts: Space starts/pauses; R resets, unless focus is in an input.
  $(document).on("keydown", function (event) {
    if ($(event.target).is("input,textarea,select") || event.ctrlKey || event.metaKey) return;
    if (event.code === "Space") { event.preventDefault(); isRunning ? pauseTimer() : startTimer(); }
    if (event.key.toLowerCase() === "r") resetTimer();
  });

  // Open the transparent output page in a separate tab/window.
  $("#openOverlayBtn").on("click", function () {
    window.open("overlay.html", "cfpaOverlay", "width=1280,height=720");
    $("#saveStatus").text(channel ? "Overlay verbunden" : "Overlay geöffnet");
  });

  // Maximize the preview canvas without changing the actual overlay output.
  $("#fullscreenBtn").on("click", function () {
    $("#previewCanvas").toggleClass("is-fullscreen");
    $("body").toggleClass("preview-fullscreen");
  });
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      $("#previewCanvas").removeClass("is-fullscreen");
      $("body").removeClass("preview-fullscreen");
    }
  });

  // Save settings in localStorage and provide a portable JSON export.
  $("#saveLayoutBtn").on("click", function () {
    readSettings();
    try {
      localStorage.setItem("cfpaOverlaySettings", JSON.stringify(settings));
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "cfpa-overlay-layout.json";
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      $("#saveStatus").text("Layout gespeichert");
    } catch (error) {
      $("#saveStatus").text("Speichern nicht verfügbar");
      alert("Lokales Speichern ist in diesem Browser nicht verfügbar. Bitte lokal über einen Webserver öffnen.");
    }
  });

  $("#restoreBtn").on("click", function () {
    stopTimer();
    applySettings(DEFAULTS);
    try { localStorage.removeItem("cfpaOverlaySettings"); } catch (error) { /* optional */ }
    $("#saveStatus").text("Standardlayout aktiv");
  });

  // Restore previous browser-local settings on startup, otherwise use the defaults.
  try {
    const saved = localStorage.getItem("cfpaOverlaySettings");
    if (saved) applySettings(JSON.parse(saved));
    else applySettings(DEFAULTS);
  } catch (error) { applySettings(DEFAULTS); }

  // Keep preview clock ticking independently of the workout timer.
  window.setInterval(function () {
    $("#previewClock").text(new Date().toLocaleTimeString("de-DE", { hour12: false }));
    broadcastState();
  }, 1000);

})(jQuery);
