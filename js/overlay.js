/* =========================================================
   Transparent overlay output receiver.
   Receives settings/timer state from index.html via BroadcastChannel.
   This page intentionally contains no opaque background.
   ========================================================= */
(function () {
  "use strict";
  const $id = (id) => document.getElementById(id);
  let latestState = null;

  function applyState(state) {
    if (!state || !state.settings) return;
    latestState = state;
    const settings = state.settings;
    document.documentElement.style.setProperty("--accent", settings.brandColor || "#c7f36b");
    $id("outBrandTitle").textContent = settings.brandTitle || "";
    $id("outBrandSubtitle").textContent = settings.brandSubtitle || "";
    $id("outWorkoutTitle").textContent = settings.workoutTitle || "";
    $id("outCoach").textContent = settings.coachName || "";
    $id("outInfo").textContent = settings.infoText || "";
    $id("outTimer").textContent = state.timerText || "12:00";
    $id("outState").textContent = state.timerState || "READY TO START";
    $id("outRound").textContent = "ROUND " + String(state.activeRound || 1).padStart(2, "0") + " / " + String(settings.roundCount || 5).padStart(2, "0");
    $id("outLeft").hidden = settings.showLeft === false;
    $id("outCenter").hidden = settings.showCenter === false;
    $id("outRight").hidden = settings.showRight === false;
    $id("outClock").hidden = settings.showClock === false;
    if (settings.logoData) {
      $id("outLogo").src = settings.logoData;
      $id("outLogo").hidden = false;
      $id("outDefaultLogo").hidden = true;
    } else {
      $id("outLogo").hidden = true;
      $id("outLogo").removeAttribute("src");
      $id("outDefaultLogo").hidden = false;
    }
    let timerColor = settings.brandColor || "#c7f36b";
    const total = Math.max(1, (Number(settings.durationMinutes) || 0) * 60 + (Number(settings.durationSeconds) || 0));
    const progress = state.remainingSeconds / total;
    if (settings.colorShift && settings.timerMode !== "stopwatch") {
      if (progress <= .2) timerColor = "#ff5b52";
      else if (progress <= .5) timerColor = "#ffd45b";
    }
    $id("outTimer").style.color = timerColor;
  }

  // Cross-tab messaging is supported on localhost/HTTPS; both pages should share the same origin.
  try {
    const channel = new BroadcastChannel("cfpa-overlay-sync");
    channel.onmessage = (event) => applyState(event.data);
  } catch (error) { /* Browser does not support BroadcastChannel. */ }

  // Poll localStorage as a fallback for basic configuration transfer.
  // The timer itself syncs live through BroadcastChannel in modern browsers.
  function applyStoredSettings() {
    try {
      const raw = localStorage.getItem("cfpaOverlaySettings");
      if (raw && !latestState) {
        const settings = JSON.parse(raw);
        applyState({ settings, timerText: String(settings.durationMinutes || 0).padStart(2,"0") + ":" + String(settings.durationSeconds || 0).padStart(2,"0"), timerState: "READY TO START", activeRound: 1, remainingSeconds: (settings.durationMinutes || 0) * 60 + (settings.durationSeconds || 0) });
      }
    } catch (error) { /* Storage may be disabled in private browsing. */ }
  }
  applyStoredSettings();
  window.setInterval(() => {
    $id("outClock").textContent = new Date().toLocaleTimeString("de-DE", { hour12: false });
    applyStoredSettings();
  }, 1000);
})();
