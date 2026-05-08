import {
  FilesetResolver,
  PoseLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";

const video = document.querySelector("#video");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const distanceCue = document.querySelector("#distanceCue");
const distanceCueText = document.querySelector("#distanceCueText");
const distanceCueMarker = document.querySelector("#distanceCueMarker");
const tabs = document.querySelector(".tabs");
const tabsPrevBtn = document.querySelector("#tabsPrevBtn");
const tabsNextBtn = document.querySelector("#tabsNextBtn");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const consentModal = document.querySelector("#consentModal");
const consentCheck = document.querySelector("#consentCheck");
const acceptConsentBtn = document.querySelector("#acceptConsentBtn");
const privacyBtn = document.querySelector("#privacyBtn");
const privacyModal = document.querySelector("#privacyModal");
const privacyContent = document.querySelector("#privacyContent");
const closePrivacyBtn = document.querySelector("#closePrivacyBtn");

const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const calibrateBtn = document.querySelector("#calibrateBtn");
const resetCalibrationBtn = document.querySelector("#resetCalibrationBtn");
const muteBtn = document.querySelector("#muteBtn");
const compactBtn = document.querySelector("#compactBtn");
const minimizeTrayBtn = document.querySelector("#minimizeTrayBtn");
const presetSelect = document.querySelector("#presetSelect");
const sensitivity = document.querySelector("#sensitivity");
const leanThresholdValue = document.querySelector("#leanThresholdValue");
const leanThresholdNumber = document.querySelector("#leanThresholdNumber");
const delay = document.querySelector("#delay");
const snoozeSelect = document.querySelector("#snoozeSelect");
const announceNotifications = document.querySelector("#announceNotifications");
const testAnnouncementBtn = document.querySelector("#testAnnouncementBtn");
const profileSelect = document.querySelector("#profileSelect");
const saveProfileBtn = document.querySelector("#saveProfileBtn");
const deleteProfileBtn = document.querySelector("#deleteProfileBtn");
const cameraMode = document.querySelector("#cameraMode");
const autoStartCamera = document.querySelector("#autoStartCamera");
const cameraSelect = document.querySelector("#cameraSelect");
const checkInterval = document.querySelector("#checkInterval");
const autoLockDelay = document.querySelector("#autoLockDelay");
const breakInterval = document.querySelector("#breakInterval");
const quietHoursEnabled = document.querySelector("#quietHoursEnabled");
const quietStart = document.querySelector("#quietStart");
const quietEnd = document.querySelector("#quietEnd");
const distanceWarning = document.querySelector("#distanceWarning");
const installStartupBtn = document.querySelector("#installStartupBtn");
const removeStartupBtn = document.querySelector("#removeStartupBtn");
const startupText = document.querySelector("#startupText");
const versionText = document.querySelector("#versionText");
const diagnosticsBtn = document.querySelector("#diagnosticsBtn");
const privacyLinkBtn = document.querySelector("#privacyLinkBtn");
const storageText = document.querySelector("#storageText");
const backupDataBtn = document.querySelector("#backupDataBtn");
const exportDataBtn = document.querySelector("#exportDataBtn");
const aboutVersionText = document.querySelector("#aboutVersionText");
const aboutStorageText = document.querySelector("#aboutStorageText");
const aboutPrivacyBtn = document.querySelector("#aboutPrivacyBtn");
const aboutDiagnosticsBtn = document.querySelector("#aboutDiagnosticsBtn");
const requirementsList = document.querySelector("#requirementsList");

const cameraState = document.querySelector("#cameraState");
const statusCard = document.querySelector("#statusCard");
const statusText = document.querySelector("#statusText");
const scoreText = document.querySelector("#scoreText");
const scoreBar = document.querySelector("#scoreBar");
const calibrationCard = document.querySelector("#calibrationCard");
const calibrationText = document.querySelector("#calibrationText");
const calibrationBar = document.querySelector("#calibrationBar");
const calibrationHelp = document.querySelector("#calibrationHelp");
const poseText = document.querySelector("#poseText");
const alertModeText = document.querySelector("#alertModeText");
const healthText = document.querySelector("#healthText");
const resetStatsBtn = document.querySelector("#resetStatsBtn");
const exportStatsBtn = document.querySelector("#exportStatsBtn");
const weeklyList = document.querySelector("#weeklyList");
const postureTimeline = document.querySelector("#postureTimeline");
const timelineEvents = document.querySelector("#timelineEvents");
const timelineCountText = document.querySelector("#timelineCountText");
const exportHabitsBtn = document.querySelector("#exportHabitsBtn");
const resetHabitsBtn = document.querySelector("#resetHabitsBtn");
const habitTracking = document.querySelector("#habitTracking");
const expressionTracking = document.querySelector("#expressionTracking");
const leftTiltText = document.querySelector("#leftTiltText");
const rightTiltText = document.querySelector("#rightTiltText");
const handFaceText = document.querySelector("#handFaceText");
const restlessText = document.querySelector("#restlessText");
const closeScreenText = document.querySelector("#closeScreenText");
const neutralFaceText = document.querySelector("#neutralFaceText");
const habitInsights = document.querySelector("#habitInsights");
const uprightTimeText = document.querySelector("#uprightTimeText");
const leaningTimeText = document.querySelector("#leaningTimeText");
const reminderCountText = document.querySelector("#reminderCountText");
const breakCountText = document.querySelector("#breakCountText");
const absenceCountText = document.querySelector("#absenceCountText");
const worstScoreText = document.querySelector("#worstScoreText");

let poseLandmarker;
let stream;
let calibrated = false;
let baseline = null;
let lastVideoTime = -1;
let lastReminderAt = 0;
let leaningSince = null;
let muted = false;
let paused = false;
let compactView = false;
let snoozeUntil = 0;
let samples = [];
let hasCameraStarted = false;
let loopStarted = false;
let cameraSleeping = false;
let periodicTimer = null;
let activeCheckStartedAt = 0;
let absenceStartedAt = null;
let lockRequested = false;
let lastStatsAt = null;
let lastStatsSaveAt = 0;
let seatedSinceBreakAt = null;
let lastBreakReminderAt = 0;
let absenceCounted = false;
let dailyStats;
let pendingCameraDeviceId = "";
let lastHealthAt = 0;
let lastHealthVideoTime = 0;
let fpsEstimate = 0;
let lastPauseToggleSeq = 0;
let lastDistanceWarningAt = 0;
let habitStats;
let lastHabitEventAt = {};
let lastMetricsForHabits = null;
let lastTimelineEventAt = {};

const MIN_CALIBRATION_SAMPLES = 15;
const PERIODIC_CHECK_DURATION_MS = 8000;
const STORAGE_KEY = "postureVisionSettings.v2";
const STATS_KEY = "postureVisionDailyStats.v1";
const HISTORY_KEY = "postureVisionStatsHistory.v1";
const PROFILE_KEY = "postureVisionProfiles.v1";
const HABIT_KEY = "postureVisionHabits.v1";
const CONSENT_KEY = "postureVisionConsent.v1";
const PERSISTED_KEYS = [STORAGE_KEY, STATS_KEY, HISTORY_KEY, PROFILE_KEY, HABIT_KEY, CONSENT_KEY];
let hydrationComplete = false;
let platformInfo = {
  mode: "unknown",
  label: "Unknown",
  capabilities: {}
};

const LANDMARKS = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24
};

const CONNECTIONS = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [0, 11],
  [0, 12]
];

const TIMELINE_LABELS = {
  lean: "Leaning forward",
  close: "Too close to screen",
  leftTilt: "Left tilt",
  rightTilt: "Right tilt",
  absent: "Away from camera"
};

function clampLeanThreshold(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function setLeanThreshold(value, { markCustom = false, persist = false } = {}) {
  const threshold = clampLeanThreshold(value);
  sensitivity.value = String(threshold);
  leanThresholdNumber.value = String(threshold);
  leanThresholdValue.textContent = `${threshold}%`;
  if (markCustom) presetSelect.value = "custom";
  if (persist) saveState();
  return threshold;
}

function getLeanThreshold() {
  return clampLeanThreshold(sensitivity.value);
}

function setStatus(text, kind = "neutral") {
  statusText.textContent = text;
  statusCard.className = `status-card ${kind}`;
}

async function serverStoreGet(key) {
  const response = await fetch(`/storage/get?key=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`Storage read failed: HTTP ${response.status}`);
  return response.json();
}

async function serverStoreSet(key, value) {
  const response = await fetch(`/storage/set?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value)
  });
  if (!response.ok) throw new Error(`Storage write failed: HTTP ${response.status}`);
  return response.json();
}

async function serverStoreDelete(key) {
  const response = await fetch(`/storage/delete?key=${encodeURIComponent(key)}`, { method: "POST" });
  if (!response.ok) throw new Error(`Storage delete failed: HTTP ${response.status}`);
  return response.json();
}

function persistJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  serverStoreSet(key, value).catch((error) => console.warn("SQLite persistence unavailable", error));
}

function persistString(key, value) {
  localStorage.setItem(key, value);
  serverStoreSet(key, value).catch((error) => console.warn("SQLite persistence unavailable", error));
}

async function hydrateFromServer() {
  try {
    const results = await Promise.all(PERSISTED_KEYS.map(async (key) => ({ key, payload: await serverStoreGet(key) })));
    results.forEach(({ key, payload }) => {
      if (!payload.found) return;
      if (key === CONSENT_KEY) {
        localStorage.setItem(key, payload.value);
        return;
      }
      localStorage.setItem(key, JSON.stringify(payload.value));
    });

    await Promise.all(PERSISTED_KEYS.map(async (key) => {
      const value = localStorage.getItem(key);
      if (value === null) return;
      if (results.some((result) => result.key === key && result.payload.found)) return;
      const parsed = key === CONSENT_KEY ? value : JSON.parse(value);
      await serverStoreSet(key, parsed);
    }));
    storageText.textContent = "SQLite active";
    aboutStorageText.textContent = "SQLite active";
  } catch (error) {
    console.warn("Using browser storage fallback", error);
    storageText.textContent = "Browser fallback";
    aboutStorageText.textContent = "Browser fallback";
  } finally {
    hydrationComplete = true;
  }
}

function consentAccepted() {
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}

function updateConsentModal() {
  consentModal.classList.toggle("hidden", consentAccepted());
}

function activateTab(tabId) {
  let activeButton = null;
  tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabId;
    button.classList.toggle("active", active);
    if (active) activeButton = button;
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  requestAnimationFrame(updateTabScrollButtons);
}

function updateTabScrollButtons() {
  if (!tabs || !tabsPrevBtn || !tabsNextBtn) return;

  const maxScroll = tabs.scrollWidth - tabs.clientWidth;
  tabsPrevBtn.disabled = tabs.scrollLeft <= 2;
  tabsNextBtn.disabled = tabs.scrollLeft >= maxScroll - 2;
}

function scrollTabs(direction) {
  if (!tabs) return;

  tabs.scrollBy({
    left: direction * Math.max(120, Math.round(tabs.clientWidth * 0.7)),
    behavior: "smooth"
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMarkdown(markdown) {
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  }

  markdown.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = Math.min(heading[1].length + 1, 4);
      blocks.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      return;
    }

    const bullet = trimmed.match(/^-\s+(.+)$/);
    if (bullet) {
      listItems.push(escapeHtml(bullet[1]));
      return;
    }

    flushList();
    blocks.push(`<p>${escapeHtml(trimmed)}</p>`);
  });

  flushList();
  return blocks.join("");
}

async function openPrivacyPolicy() {
  privacyModal.classList.remove("hidden");
  privacyContent.innerHTML = "<p>Loading privacy policy...</p>";

  try {
    const response = await fetch("PRIVACY.md");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    privacyContent.innerHTML = renderMarkdown(markdown);
  } catch (error) {
    console.error(error);
    privacyContent.innerHTML = "<p>Could not load the privacy policy file.</p>";
  }
}

function closePrivacyPolicy() {
  privacyModal.classList.add("hidden");
}

function updateMuteButton() {
  muteBtn.textContent = muted ? "Meeting mode on" : "Meeting mode off";
  alertModeText.textContent = muted || quietHoursActive()
    ? "Visual only"
    : announceNotifications.value === "on" ? "Voice on" : "Notifications only";
}

function alertsSuppressed() {
  return muted || performance.now() < snoozeUntil || quietHoursActive();
}

function spokenAnnouncementsEnabled() {
  return announceNotifications.value === "on" && !muted && !quietHoursActive();
}

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function quietHoursActive() {
  if (quietHoursEnabled.value !== "on") return false;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutesFromTime(quietStart.value || "18:00");
  const end = minutesFromTime(quietEnd.value || "09:00");

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function updatePauseButton() {
  pauseBtn.disabled = !hasCameraStarted;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
}

function updateCompactButton() {
  document.body.classList.toggle("compact", compactView);
  compactBtn.textContent = compactView ? "Full view" : "Compact view";
}

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProfiles(profiles) {
  persistJson(PROFILE_KEY, profiles);
}

function refreshProfileList(selected = profileSelect.value || "default") {
  const profiles = loadProfiles();
  profileSelect.innerHTML = '<option value="default">Default</option>';
  Object.keys(profiles).sort().forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    profileSelect.appendChild(option);
  });
  profileSelect.value = selected === "default" || profiles[selected] ? selected : "default";
}

function loadSelectedProfile() {
  const profiles = loadProfiles();
  const profile = profiles[profileSelect.value];
  if (!profile) return;

  baseline = profile.baseline;
  showSavedCalibration(profile.savedAt);
  setStatus(`Loaded calibration profile "${profileSelect.value}".`, "good");
}

function archiveDailyStatsIfNeeded() {
  if (!dailyStats || dailyStats.date === todayKey()) return;

  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  history[dailyStats.date] = dailyStats;
  persistJson(HISTORY_KEY, history);
  dailyStats = emptyDailyStats();
}

function renderWeeklyStats() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  const rows = [];
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    rows.push(key === dailyStats.date ? dailyStats : history[key] || { date: key, uprightMs: 0, leaningMs: 0 });
  }

  weeklyList.innerHTML = "";
  rows.forEach((row) => {
    const total = row.uprightMs + row.leaningMs;
    const uprightPercent = total ? Math.round((row.uprightMs / total) * 100) : 0;
    const item = document.createElement("div");
    item.className = "weekly-row";
    item.innerHTML = `<span>${row.date.slice(5)}</span><div class="weekly-bar"><span style="width:${uprightPercent}%"></span></div><strong>${uprightPercent}%</strong>`;
    weeklyList.appendChild(item);
  });
}

function emptyHabitStats() {
  return {
    date: todayKey(),
    counts: {
      leftTilt: 0,
      rightTilt: 0,
      handFace: 0,
      restless: 0,
      closeScreen: 0,
      neutralFace: 0
    },
    events: []
  };
}

function loadHabitStats() {
  try {
    const payload = JSON.parse(localStorage.getItem(HABIT_KEY) || "null");
    habitStats = payload?.date === todayKey() ? payload : emptyHabitStats();
  } catch {
    habitStats = emptyHabitStats();
  }
  renderHabitStats();
}

function saveHabitStats() {
  persistJson(HABIT_KEY, habitStats);
}

function recordHabit(type, detail = {}) {
  if (habitTracking.value !== "on" || !habitStats) return;

  const now = performance.now();
  if (now - (lastHabitEventAt[type] || 0) < 10000) return;
  lastHabitEventAt[type] = now;

  habitStats.counts[type] = (habitStats.counts[type] || 0) + 1;
  habitStats.events.push({
    type,
    detail,
    at: new Date().toISOString()
  });
  if (habitStats.events.length > 1000) habitStats.events.shift();
  saveHabitStats();
  renderHabitStats();
}

function renderHabitStats() {
  if (!habitStats) return;

  leftTiltText.textContent = String(habitStats.counts.leftTilt || 0);
  rightTiltText.textContent = String(habitStats.counts.rightTilt || 0);
  handFaceText.textContent = String(habitStats.counts.handFace || 0);
  restlessText.textContent = String(habitStats.counts.restless || 0);
  closeScreenText.textContent = String(habitStats.counts.closeScreen || 0);
  neutralFaceText.textContent = String(habitStats.counts.neutralFace || 0);

  const insights = buildHabitInsights();
  habitInsights.innerHTML = "";
  insights.forEach((text) => {
    const item = document.createElement("div");
    item.textContent = text;
    habitInsights.appendChild(item);
  });
}

function buildHabitInsights() {
  const counts = habitStats?.counts || {};
  const insights = [];
  const left = counts.leftTilt || 0;
  const right = counts.rightTilt || 0;

  if (left + right > 0) {
    insights.push(right > left ? "You tilt right more often than left today." : "You tilt left more often than right today.");
  }
  if ((counts.handFace || 0) >= 3) {
    insights.push("Hand-to-face events are recurring. This may indicate nail biting, chin resting, or face touching.");
  }
  if ((counts.closeScreen || 0) >= 3) {
    insights.push("You repeatedly moved close to the screen. Consider moving the laptop farther back or increasing font size.");
  }
  if ((counts.restless || 0) >= 5) {
    insights.push("Frequent posture shifts were detected. A short break or chair adjustment may help.");
  }
  if ((counts.neutralFace || 0) >= 6) {
    insights.push("Long focused/neutral expression periods were detected. Watch for eye strain and remember to blink/rest your eyes.");
  }
  if (!insights.length) {
    insights.push(habitTracking.value === "on" ? "No strong habit pattern yet. Keep monitoring for a longer session." : "Enable detailed habit tracking to collect local insights.");
  }
  return insights;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDailyStats() {
  return {
    date: todayKey(),
    uprightMs: 0,
    leaningMs: 0,
    absentEvents: 0,
    reminders: 0,
    breaks: 0,
    worstScore: 0,
    timeline: []
  };
}

function normalizeDailyStats(stats) {
  return {
    ...emptyDailyStats(),
    ...(stats || {}),
    timeline: Array.isArray(stats?.timeline) ? stats.timeline : []
  };
}

function loadDailyStats() {
  try {
    const payload = JSON.parse(localStorage.getItem(STATS_KEY) || "null");
    dailyStats = normalizeDailyStats(payload);
    archiveDailyStatsIfNeeded();
  } catch {
    dailyStats = emptyDailyStats();
  }
  renderDailyStats();
  renderWeeklyStats();
}

function saveDailyStats() {
  persistJson(STATS_KEY, dailyStats);
  lastStatsSaveAt = performance.now();
}

function saveDailyStatsSoon() {
  if (performance.now() - lastStatsSaveAt > 5000) {
    saveDailyStats();
  }
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) {
    return `${Math.floor(ms / 1000)}s`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return hours ? `${hours}h ${restMinutes}m` : `${minutes}m`;
}

function renderDailyStats() {
  uprightTimeText.textContent = formatDuration(dailyStats.uprightMs);
  leaningTimeText.textContent = formatDuration(dailyStats.leaningMs);
  reminderCountText.textContent = String(dailyStats.reminders);
  breakCountText.textContent = String(dailyStats.breaks || 0);
  absenceCountText.textContent = String(dailyStats.absentEvents);
  worstScoreText.textContent = `${Math.round(dailyStats.worstScore)}%`;
  renderTimeline();
  renderWeeklyStats();
}

function timelineClass(type) {
  if (type === "leftTilt" || type === "rightTilt") return type;
  return type;
}

function timelineLabel(event) {
  const base = TIMELINE_LABELS[event.type] || event.type;
  if (event.detail?.score !== undefined) return `${base} (${Math.round(event.detail.score)}%)`;
  return base;
}

function renderTimeline() {
  if (!postureTimeline || !timelineEvents || !timelineCountText || !dailyStats) return;

  const events = Array.isArray(dailyStats.timeline) ? dailyStats.timeline : [];
  timelineCountText.textContent = `${events.length} ${events.length === 1 ? "event" : "events"}`;
  postureTimeline.innerHTML = "";
  timelineEvents.innerHTML = "";

  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No posture events recorded today.";
    postureTimeline.appendChild(empty);
    return;
  }

  const dayStart = new Date(`${dailyStats.date}T00:00:00`);
  const dayMs = 24 * 60 * 60 * 1000;
  events.slice(-240).forEach((event) => {
    const at = new Date(event.at);
    if (Number.isNaN(at.getTime())) return;
    const percent = Math.max(0, Math.min(100, ((at - dayStart) / dayMs) * 100));
    const marker = document.createElement("span");
    marker.className = `timeline-marker ${timelineClass(event.type)}`;
    marker.style.left = `${percent}%`;
    marker.title = `${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${timelineLabel(event)}`;
    postureTimeline.appendChild(marker);
  });

  events.slice(-8).reverse().forEach((event) => {
    const at = new Date(event.at);
    const item = document.createElement("div");
    item.className = "timeline-event";
    const time = Number.isNaN(at.getTime()) ? "" : at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    item.innerHTML = `<time>${time}</time><span>${escapeHtml(timelineLabel(event))}</span>`;
    timelineEvents.appendChild(item);
  });
}

function resetDailyStats() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  delete history[todayKey()];
  persistJson(HISTORY_KEY, history);
  dailyStats = emptyDailyStats();
  lastStatsAt = null;
  lastTimelineEventAt = {};
  absenceCounted = false;
  saveDailyStats();
  renderDailyStats();
}

function recordTimelineEvent(type, detail = {}, minimumGapMs = 60000) {
  if (!dailyStats || dailyStats.date !== todayKey()) {
    archiveDailyStatsIfNeeded();
    dailyStats = emptyDailyStats();
  }

  const now = performance.now();
  if (now - (lastTimelineEventAt[type] || 0) < minimumGapMs) return;
  lastTimelineEventAt[type] = now;

  dailyStats.timeline ??= [];
  dailyStats.timeline.push({
    type,
    detail,
    at: new Date().toISOString()
  });
  if (dailyStats.timeline.length > 500) dailyStats.timeline.shift();
  saveDailyStats();
  renderTimeline();
}

function recordTimelineSignals(metrics, score) {
  if (!calibrated || !baseline || !metrics) return;

  if (score >= getLeanThreshold()) {
    recordTimelineEvent("lean", { score }, 60000);
  }

  const closeLimit = distanceWarning.value === "strict" ? 0.12 : 0.2;
  const closeDelta = metrics.faceScale - baseline.faceScale;
  if (closeDelta > closeLimit) {
    recordTimelineEvent("close", { delta: closeDelta }, 60000);
  }

  const sideDelta = metrics.headSideOffset - baseline.headSideOffset;
  if (sideDelta > 0.18) {
    recordTimelineEvent(metrics.headSideDirection === "left" ? "leftTilt" : "rightTilt", { delta: sideDelta }, 60000);
  }
}

function recordPostureStats(score, present) {
  if (!dailyStats || dailyStats.date !== todayKey()) {
    archiveDailyStatsIfNeeded();
    dailyStats = emptyDailyStats();
  }

  const now = performance.now();
  if (lastStatsAt === null || !present || cameraSleeping) {
    if (calibrated && !present && !cameraSleeping) {
      recordTimelineEvent("absent", {}, 60000);
    }
    lastStatsAt = now;
    renderDailyStats();
    return;
  }

  const delta = Math.min(now - lastStatsAt, 1000);
  lastStatsAt = now;

  if (!calibrated) {
    renderDailyStats();
    return;
  }

  if (score >= getLeanThreshold()) {
    dailyStats.leaningMs += delta;
  } else {
    dailyStats.uprightMs += delta;
  }

  dailyStats.worstScore = Math.max(dailyStats.worstScore, score);
  saveDailyStatsSoon();
  renderDailyStats();
}

function saveState() {
  const payload = {
    baseline,
    calibrated,
    paused,
    compactView,
    preset: presetSelect.value,
    snoozeUntil: snoozeUntil > performance.now() ? Date.now() + (snoozeUntil - performance.now()) : 0,
    profile: profileSelect.value,
    sensitivity: String(getLeanThreshold()),
    delay: delay.value,
    announceNotifications: announceNotifications.value,
    cameraMode: cameraMode.value,
    autoStartCamera: autoStartCamera.value,
    cameraDeviceId: cameraSelect.value,
    checkInterval: checkInterval.value,
    autoLockDelay: autoLockDelay.value,
    breakInterval: breakInterval.value,
    quietHoursEnabled: quietHoursEnabled.value,
    quietStart: quietStart.value,
    quietEnd: quietEnd.value,
    distanceWarning: distanceWarning.value,
    habitTracking: habitTracking.value,
    expressionTracking: expressionTracking.value,
    muted,
    savedAt: new Date().toISOString()
  };

  persistJson(STORAGE_KEY, payload);
}

function showSavedCalibration(savedAt) {
  calibrated = true;
  resetCalibrationBtn.disabled = false;
  calibrateBtn.disabled = false;
  calibrateBtn.textContent = "Recalibrate upright";
  calibrationText.textContent = "Saved baseline loaded";
  calibrationBar.style.width = "100%";
  calibrationCard.className = "calibration-card done";
  calibrationHelp.textContent = savedAt
    ? `Saved calibration loaded from ${new Date(savedAt).toLocaleString()}. Recalibrate if your camera or chair moved.`
    : "Saved calibration loaded. Recalibrate if your camera or chair moved.";
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);
    if (typeof payload?.paused === "boolean") {
      paused = payload.paused;
      updatePauseButton();
    }
    if (typeof payload?.compactView === "boolean") {
      compactView = payload.compactView;
      updateCompactButton();
    }
    if (payload?.preset) presetSelect.value = payload.preset;
    if (payload?.snoozeUntil && payload.snoozeUntil > Date.now()) {
      snoozeUntil = performance.now() + (payload.snoozeUntil - Date.now());
      snoozeSelect.value = "0";
    }
    if (payload?.sensitivity) setLeanThreshold(payload.sensitivity);
    if (payload?.delay) delay.value = payload.delay;
    if (payload?.announceNotifications) announceNotifications.value = payload.announceNotifications;
    if (payload?.cameraMode) cameraMode.value = payload.cameraMode;
    if (payload?.autoStartCamera) autoStartCamera.value = payload.autoStartCamera;
    if (payload?.cameraDeviceId) pendingCameraDeviceId = payload.cameraDeviceId;
    if (payload?.checkInterval) checkInterval.value = payload.checkInterval;
    if (payload?.autoLockDelay) autoLockDelay.value = payload.autoLockDelay;
    if (payload?.breakInterval) breakInterval.value = payload.breakInterval;
    if (payload?.quietHoursEnabled) quietHoursEnabled.value = payload.quietHoursEnabled;
    if (payload?.quietStart) quietStart.value = payload.quietStart;
    if (payload?.quietEnd) quietEnd.value = payload.quietEnd;
    if (payload?.distanceWarning) distanceWarning.value = payload.distanceWarning;
    if (payload?.habitTracking) habitTracking.value = payload.habitTracking;
    if (payload?.expressionTracking) expressionTracking.value = payload.expressionTracking;
    if (typeof payload?.muted === "boolean") {
      muted = payload.muted;
      updateMuteButton();
    }

    if (payload?.baseline) {
      baseline = payload.baseline;
      showSavedCalibration(payload.savedAt);
      setStatus("Saved calibration loaded. Start camera to monitor seated leaning.", "good");
    }
    if (payload?.profile) {
      refreshProfileList(payload.profile);
    }
  } catch (error) {
    console.warn("Ignoring invalid saved posture settings", error);
    localStorage.removeItem(STORAGE_KEY);
    serverStoreDelete(STORAGE_KEY).catch((error) => console.warn("Could not delete invalid saved settings", error));
  }
}

function clearSavedCalibration() {
  localStorage.removeItem(STORAGE_KEY);
  serverStoreDelete(STORAGE_KEY).catch((error) => console.warn("Could not delete saved settings", error));
  calibrated = false;
  baseline = null;
  samples = [];
  leaningSince = null;
  resetCalibrationBtn.disabled = true;
  calibrateBtn.textContent = "Calibrate upright";
  calibrateBtn.disabled = !hasCameraStarted;
  calibrationText.textContent = hasCameraStarted ? `0/${MIN_CALIBRATION_SAMPLES} frames` : "Not started";
  calibrationBar.style.width = "0%";
  calibrationCard.className = "calibration-card idle";
  calibrationHelp.textContent = hasCameraStarted
    ? "Collecting seated posture frames. Keep your head and shoulders in view."
    : "Start the camera, sit upright, and keep your head and shoulders visible.";
  setStatus("Saved calibration cleared. Calibrate again while seated upright.", "neutral");
}

function describeStartupError(error) {
  const name = error?.name || "Error";
  const message = error?.message || String(error);

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access in the browser address bar.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No webcam was found. Connect a camera or choose one in browser settings.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The webcam is already in use by another app. Close the other app and try again.";
  }

  return `Startup failed: ${message}`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z || 0) + (b.z || 0)) / 2
  };
}

function visible(lm, index, minVisibility = 0.55) {
  const point = lm[index];
  return point && (point.visibility === undefined || point.visibility >= minVisibility);
}

function averageWorld(points) {
  const valid = points.filter(Boolean);
  if (!valid.length) return null;
  return valid.reduce(
    (acc, point) => ({
      x: acc.x + point.x / valid.length,
      y: acc.y + point.y / valid.length,
      z: acc.z + point.z / valid.length
    }),
    { x: 0, y: 0, z: 0 }
  );
}

function getMetrics(landmarks, worldLandmarks) {
  const required = [
    LANDMARKS.nose,
    LANDMARKS.leftShoulder,
    LANDMARKS.rightShoulder
  ];

  if (!required.every((index) => visible(landmarks, index, 0.45))) {
    return null;
  }

  const leftShoulder = landmarks[LANDMARKS.leftShoulder];
  const rightShoulder = landmarks[LANDMARKS.rightShoulder];
  const nose = landmarks[LANDMARKS.nose];
  const leftEye = landmarks[LANDMARKS.leftEye];
  const rightEye = landmarks[LANDMARKS.rightEye];
  const leftEar = landmarks[LANDMARKS.leftEar];
  const rightEar = landmarks[LANDMARKS.rightEar];

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const shoulderWidth = Math.max(distance(leftShoulder, rightShoulder), 0.001);
  const eyeWidth =
    visible(landmarks, LANDMARKS.leftEye, 0.35) && visible(landmarks, LANDMARKS.rightEye, 0.35)
      ? distance(leftEye, rightEye)
      : 0;
  const earWidth =
    visible(landmarks, LANDMARKS.leftEar, 0.35) && visible(landmarks, LANDMARKS.rightEar, 0.35)
      ? distance(leftEar, rightEar)
      : 0;

  const faceWidth = Math.max(eyeWidth, earWidth, 0.001);
  const faceScale = faceWidth / shoulderWidth;
  const headDrop = (nose.y - shoulderMid.y) / shoulderWidth;
  const headSideRaw = (nose.x - shoulderMid.x) / shoulderWidth;
  const headSideOffset = Math.abs(headSideRaw);
  const headSideDirection = headSideRaw < 0 ? "left" : "right";
  const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth;
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const handFaceProxy = Math.max(
    leftWrist ? 1 - Math.min(distance(leftWrist, nose) / shoulderWidth, 1) : 0,
    rightWrist ? 1 - Math.min(distance(rightWrist, nose) / shoulderWidth, 1) : 0
  );

  let headForward = 0;
  if (worldLandmarks?.length) {
    const worldShoulders = averageWorld([
      worldLandmarks[LANDMARKS.leftShoulder],
      worldLandmarks[LANDMARKS.rightShoulder]
    ]);
    const worldHead = averageWorld([
      worldLandmarks[LANDMARKS.nose],
      worldLandmarks[LANDMARKS.leftEye],
      worldLandmarks[LANDMARKS.rightEye],
      worldLandmarks[LANDMARKS.leftEar],
      worldLandmarks[LANDMARKS.rightEar]
    ]);

    if (worldShoulders && worldHead) {
      headForward = worldShoulders.z - worldHead.z;
    }
  }

  return {
    faceScale,
    headDrop,
    headForward,
    headSideOffset,
    headSideDirection,
    handFaceProxy,
    shoulderSlope
  };
}

function scorePosture(metrics) {
  if (!baseline) return 0;

  const forwardChange = Math.max(0, metrics.headForward - baseline.headForward);
  const faceScaleChange = Math.max(0, metrics.faceScale - baseline.faceScale);
  const dropChange = Math.max(0, metrics.headDrop - baseline.headDrop);
  const shoulderSlopePenalty = Math.max(0, metrics.shoulderSlope - baseline.shoulderSlope - 0.05);
  const sidePenalty = Math.max(0, metrics.headSideOffset - baseline.headSideOffset - 0.12);

  const raw =
    forwardChange * 150 +
    faceScaleChange * 120 +
    dropChange * 70 +
    shoulderSlopePenalty * 45 +
    sidePenalty * 30;
  return Math.max(0, Math.min(100, raw));
}

function drawPose(landmarks) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!landmarks) return;

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(15, 118, 110, 0.9)";
  CONNECTIONS.forEach(([from, to]) => {
    const a = landmarks[from];
    const b = landmarks[to];
    if (!a || !b || !visible(landmarks, from, 0.35) || !visible(landmarks, to, 0.35)) return;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  });

  ctx.fillStyle = "#ffffff";
  [0, 11, 12, 23, 24].forEach((index) => {
    const point = landmarks[index];
    if (!point || !visible(landmarks, index, 0.35)) return;
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateDistanceCue(metrics) {
  if (!distanceCue || !distanceCueText || !distanceCueMarker) return;

  if (!metrics) {
    distanceCue.className = "distance-cue idle";
    distanceCueText.textContent = hasCameraStarted ? "Finding pose" : "Waiting";
    distanceCueMarker.style.left = "50%";
    return;
  }

  if (!baseline) {
    distanceCue.className = "distance-cue idle";
    distanceCueText.textContent = "Calibrate";
    distanceCueMarker.style.left = "50%";
    return;
  }

  const ratio = metrics.faceScale / Math.max(baseline.faceScale, 0.001);
  const markerPercent = Math.max(0, Math.min(100, ((ratio - 0.68) / 0.72) * 100));
  const closeLimit = distanceWarning.value === "strict" ? 1.12 : 1.2;
  const farLimit = 0.82;
  let cue = "good";
  let label = "Good";

  if (ratio > closeLimit) {
    cue = "close";
    label = "Too close";
  } else if (ratio < farLimit) {
    cue = "far";
    label = "Too far";
  }

  distanceCue.className = `distance-cue ${cue}`;
  distanceCueText.textContent = label;
  distanceCueMarker.style.left = `${markerPercent}%`;
}

function updateScore(score) {
  const rounded = Math.round(score);
  scoreText.textContent = `${rounded}%`;
  scoreBar.style.width = `${rounded}%`;
  scoreBar.style.backgroundColor = score >= getLeanThreshold() ? "#b91c1c" : score > 35 ? "#b45309" : "#0f766e";
}

function updateCalibrationReadiness() {
  if (!hasCameraStarted || calibrated) return;

  const readyCount = Math.min(samples.length, MIN_CALIBRATION_SAMPLES);
  const percent = (readyCount / MIN_CALIBRATION_SAMPLES) * 100;
  calibrateBtn.disabled = samples.length < MIN_CALIBRATION_SAMPLES;
  calibrationText.textContent =
    samples.length >= MIN_CALIBRATION_SAMPLES ? "Ready" : `${readyCount}/${MIN_CALIBRATION_SAMPLES} frames`;
  calibrationBar.style.width = `${percent}%`;
  calibrationCard.className = `calibration-card ${samples.length >= MIN_CALIBRATION_SAMPLES ? "ready" : "idle"}`;
  calibrationHelp.textContent =
    samples.length >= MIN_CALIBRATION_SAMPLES
      ? "Ready. Sit normally upright and press Calibrate upright."
      : "Collecting seated posture frames. Keep your head and shoulders in view.";
}

function notifyUser(title, body, { announce = false } = {}) {
  fetch("/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, announce: announce && spokenAnnouncementsEnabled() })
  }).catch((error) => console.warn("Native notification failed", error));
}

function forceNotifyUser(title, body, { announce = false } = {}) {
  fetch("/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, announce: announce && spokenAnnouncementsEnabled(), force: true })
  }).catch((error) => console.warn("Native notification failed", error));
}

function remind() {
  if (alertsSuppressed()) return;

  dailyStats.reminders += 1;
  saveDailyStats();
  renderDailyStats();

  const body = "You are leaning forward. Sit back upright.";
  notifyUser("Posture reminder", body, { announce: true });
}

function speakAndNotify(title, body) {
  if (alertsSuppressed()) return;

  notifyUser(title, body, { announce: true });
}

function remindBreak() {
  dailyStats.breaks = (dailyStats.breaks || 0) + 1;
  saveDailyStats();
  renderDailyStats();
  setStatus("Break reminder. Stand up or stretch for a moment.", "warn");
  speakAndNotify("Break reminder", "Time for a short break. Stand up or stretch for a moment.");
}

function updateBreakReminder(isPresent) {
  const interval = Number(breakInterval.value);
  const now = performance.now();

  if (!calibrated || !interval || cameraSleeping || !isPresent) {
    seatedSinceBreakAt = isPresent ? seatedSinceBreakAt : null;
    return;
  }

  seatedSinceBreakAt ??= now;

  if (now - seatedSinceBreakAt >= interval && now - lastBreakReminderAt > 60000) {
    lastBreakReminderAt = now;
    seatedSinceBreakAt = now;
    remindBreak();
  }
}

function updateDistanceWarning(metrics) {
  if (!calibrated || !baseline || distanceWarning.value === "off") return;

  const threshold = distanceWarning.value === "strict" ? 0.12 : 0.2;
  const faceScaleChange = metrics.faceScale - baseline.faceScale;
  const now = performance.now();

  if (faceScaleChange > threshold && now - lastDistanceWarningAt > 20000) {
    lastDistanceWarningAt = now;
    recordHabit("closeScreen", { faceScaleChange });
    setStatus("You are close to the screen. Sit back a little.", "warn");
    speakAndNotify("Distance warning", "You are close to the screen. Sit back a little.");
  }
}

function updateHabitSignals(metrics) {
  if (!calibrated || !baseline || habitTracking.value !== "on") return;

  const sideDelta = metrics.headSideOffset - baseline.headSideOffset;
  if (sideDelta > 0.18) {
    recordHabit(metrics.headSideDirection === "left" ? "leftTilt" : "rightTilt", { sideDelta });
  }

  const closeDelta = metrics.faceScale - baseline.faceScale;
  if (closeDelta > 0.22) {
    recordHabit("closeScreen", { closeDelta });
  }

  if (metrics.handFaceProxy > 0.8) {
    recordHabit("handFace", { score: metrics.handFaceProxy });
  }

  if (lastMetricsForHabits) {
    const movement =
      Math.abs(metrics.headDrop - lastMetricsForHabits.headDrop) +
      Math.abs(metrics.headSideOffset - lastMetricsForHabits.headSideOffset) +
      Math.abs(metrics.faceScale - lastMetricsForHabits.faceScale);
    if (movement > 0.18) {
      recordHabit("restless", { movement });
    }
  }
  lastMetricsForHabits = metrics;

  if (expressionTracking.value === "on" && Math.abs(metrics.headDrop - baseline.headDrop) < 0.08 && Math.abs(closeDelta) < 0.08) {
    recordHabit("neutralFace", { confidence: 0.55 });
  }
}

function handlePosture(score) {
  if (!calibrated) {
    if (samples.length >= MIN_CALIBRATION_SAMPLES) {
      setStatus("Calibration ready. Press Calibrate upright while sitting normally.", "neutral");
    } else {
      setStatus("Sit upright and hold still while calibration frames collect.", "neutral");
    }
    return;
  }

  const threshold = getLeanThreshold();
  const now = performance.now();

  if (score >= threshold) {
    leaningSince ??= now;
    const elapsed = now - leaningSince;
    setStatus(elapsed >= Number(delay.value) ? "Lean detected. Sit back upright." : "Possible forward lean...", elapsed >= Number(delay.value) ? "bad" : "warn");

    if (elapsed >= Number(delay.value) && now - lastReminderAt > 15000) {
      lastReminderAt = now;
      remind();
    }
  } else {
    leaningSince = null;
    setStatus("Posture looks upright.", "good");
  }
}

async function loadPoseModel() {
  if (poseLandmarker) return;

  setStatus("Loading pose model...", "neutral");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55
  });
}

function resizeCanvas() {
  const wrapRect = video.parentElement.getBoundingClientRect();
  let width = wrapRect.width;
  let height = wrapRect.height;

  if (video.videoWidth && video.videoHeight) {
    const videoRatio = video.videoWidth / video.videoHeight;
    const boxRatio = wrapRect.width / wrapRect.height;

    if (boxRatio > videoRatio) {
      height = wrapRect.height;
      width = height * videoRatio;
    } else {
      width = wrapRect.width;
      height = width / videoRatio;
    }
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

function updateCameraHealth(present) {
  const now = performance.now();
  if (now - lastHealthAt < 1000) return;

  const deltaTime = Math.max(video.currentTime - lastHealthVideoTime, 0.001);
  fpsEstimate = Math.round(1 / deltaTime);
  lastHealthAt = now;
  lastHealthVideoTime = video.currentTime;

  const resolution = video.videoWidth && video.videoHeight ? `${video.videoWidth}x${video.videoHeight}` : "No video";
  healthText.textContent = present ? `${resolution}, ~${fpsEstimate} FPS` : `${resolution}, framing`;
}

async function refreshCameraList() {
  if (!navigator.mediaDevices?.enumerateDevices) return;

  const current = cameraSelect.value || pendingCameraDeviceId;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");

  cameraSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Default camera";
  cameraSelect.appendChild(defaultOption);

  cameras.forEach((camera, index) => {
    const option = document.createElement("option");
    option.value = camera.deviceId;
    option.textContent = camera.label || `Camera ${index + 1}`;
    cameraSelect.appendChild(option);
  });

  if (current && cameras.some((camera) => camera.deviceId === current)) {
    cameraSelect.value = current;
  } else {
    cameraSelect.value = "";
  }

  pendingCameraDeviceId = "";
}

function cameraConstraints() {
  const deviceId = cameraSelect.value;
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: deviceId ? undefined : "user",
    deviceId: deviceId ? { exact: deviceId } : undefined
  };
}

async function openCameraStream() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: cameraConstraints(),
    audio: false
  });

  video.srcObject = stream;
  await video.play();
  cameraSleeping = false;
  activeCheckStartedAt = performance.now();
  cameraState.classList.add("hidden");
  resizeCanvas();
  await refreshCameraList();
}

function stopCameraStream() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  stream = null;
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateDistanceCue(null);
  cameraState.classList.remove("hidden");
}

function schedulePeriodicRest() {
  if (!calibrated || cameraMode.value !== "periodic" || cameraSleeping) return;

  cameraSleeping = true;
  loopStarted = false;
  stopCameraStream();
  poseText.textContent = "Resting";
  cameraState.textContent = "Camera off between privacy checks";
  setStatus("Privacy mode is resting the camera between posture checks.", "neutral");

  clearTimeout(periodicTimer);
  periodicTimer = setTimeout(wakeForPeriodicCheck, Number(checkInterval.value));
}

async function wakeForPeriodicCheck() {
  if (!calibrated || cameraMode.value !== "periodic") return;

  try {
    cameraState.textContent = "Starting posture check...";
    await openCameraStream();
    setStatus("Running a short seated posture check.", "neutral");
    if (!loopStarted) {
      loopStarted = true;
      scheduleLoop();
    }
  } catch (error) {
    console.error(error);
    cameraSleeping = false;
    setStatus(describeStartupError(error), "bad");
  }
}

function maybeRestCamera(score) {
  if (!calibrated || cameraMode.value !== "periodic" || cameraSleeping) return;

  const threshold = getLeanThreshold();
  const checkedLongEnough = performance.now() - activeCheckStartedAt >= PERIODIC_CHECK_DURATION_MS;
  if (checkedLongEnough && score < threshold) {
    schedulePeriodicRest();
  }
}

async function requestComputerLock() {
  if (lockRequested) return;

  lockRequested = true;
  setStatus("No seated pose detected. Locking computer...", "bad");

  try {
    const response = await fetch("/lock", { method: "POST" });
    if (!response.ok) {
      throw new Error(`Lock request failed with HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(error);
    lockRequested = false;
    setStatus("Auto-lock failed. Make sure the app is running from serve.py on Windows.", "bad");
  }
}

function updateAbsenceLock(isPresent) {
  const lockDelay = Number(autoLockDelay.value);

  if (!calibrated || !lockDelay || cameraMode.value !== "continuous" || cameraSleeping) {
    absenceStartedAt = null;
    return;
  }

  if (isPresent) {
    absenceStartedAt = null;
    absenceCounted = false;
    lockRequested = false;
    return;
  }

  absenceStartedAt ??= performance.now();
  if (!absenceCounted) {
    dailyStats.absentEvents += 1;
    absenceCounted = true;
    saveDailyStats();
  }
  const elapsed = performance.now() - absenceStartedAt;
  poseText.textContent = `Absent ${Math.ceil(elapsed / 1000)}s`;
  setStatus(`No seated pose detected. Auto-lock in ${Math.max(0, Math.ceil((lockDelay - elapsed) / 1000))}s.`, "warn");

  if (elapsed >= lockDelay) {
    requestComputerLock();
  }
}

async function startCamera() {
  if (hasCameraStarted && stream && !cameraSleeping) return;

  if (!consentAccepted()) {
    updateConsentModal();
    setStatus("Review the local processing notice before starting the camera.", "warn");
    return;
  }

  startBtn.disabled = true;

  try {
    await loadPoseModel();
    await openCameraStream();
    hasCameraStarted = true;
    updatePauseButton();
    samples = [];
    calibrateBtn.disabled = true;
    calibrateBtn.textContent = "Calibrate upright";
    startBtn.textContent = "Camera running";
    if (calibrated && baseline) {
      showSavedCalibration();
      setStatus("Camera running with saved calibration. Recalibrate if your seated setup changed.", "good");
    } else {
      calibrationText.textContent = `0/${MIN_CALIBRATION_SAMPLES} frames`;
      calibrationBar.style.width = "0%";
      calibrationCard.className = "calibration-card idle";
      calibrationHelp.textContent = "Collecting seated posture frames. Keep your head and shoulders in view.";
      setStatus("Sit upright and hold still while calibration frames collect.", "neutral");
    }

    if (!loopStarted) {
      loopStarted = true;
      scheduleLoop();
    }
  } catch (error) {
    console.error(error);
    startBtn.disabled = false;
    startBtn.textContent = "Start camera";
    setStatus(describeStartupError(error), "bad");
  }
}

async function autoStartCameraIfEnabled() {
  if (autoStartCamera.value !== "on" || !consentAccepted()) return;

  try {
    await startCamera();
  } catch (error) {
    console.warn("Auto-start camera failed", error);
  }
}

function scheduleLoop() {
  if (!loopStarted) return;

  if (document.visibilityState === "hidden") {
    setTimeout(loop, 500);
    return;
  }

  requestAnimationFrame(loop);
}

function loop() {
  if (cameraSleeping) {
    loopStarted = false;
    return;
  }

  if (!poseLandmarker || video.readyState < 2) {
    scheduleLoop();
    return;
  }

  resizeCanvas();

  if (paused) {
    setStatus("Monitoring paused.", "neutral");
    scheduleLoop();
    return;
  }

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = poseLandmarker.detectForVideo(video, performance.now());
    const landmarks = result.landmarks?.[0];
    const worldLandmarks = result.worldLandmarks?.[0];

    drawPose(landmarks);

    if (!landmarks) {
      updateDistanceCue(null);
      updateCameraHealth(false);
      poseText.textContent = "Not found";
      recordPostureStats(0, false);
      updateBreakReminder(false);
      updateAbsenceLock(false);
      updateScore(0);
      updateCalibrationReadiness();
      if (!calibrated) {
        calibrationCard.className = "calibration-card blocked";
        calibrationHelp.textContent = "Pose not found. Adjust the camera so it sees your head and both shoulders while seated.";
      }
      setStatus("Move into view so your head and shoulders are visible.", "warn");
    } else {
      const metrics = getMetrics(landmarks, worldLandmarks);
      if (!metrics) {
        updateDistanceCue(null);
        updateCameraHealth(false);
        poseText.textContent = "Partial";
        recordPostureStats(0, false);
        updateBreakReminder(false);
        updateAbsenceLock(false);
        updateCalibrationReadiness();
        if (!calibrated) {
          calibrationCard.className = "calibration-card blocked";
          calibrationHelp.textContent = "Partial pose. The app only needs your head and both shoulders for seated calibration.";
        }
        setStatus("Keep your head and both shoulders in frame.", "warn");
      } else {
        updateCameraHealth(true);
        updateAbsenceLock(true);
        updateBreakReminder(true);
        poseText.textContent = "Detected";
        samples.push(metrics);
        if (samples.length > 90) samples.shift();
        updateCalibrationReadiness();
        const score = scorePosture(metrics);
        recordPostureStats(score, true);
        updateScore(score);
        updateDistanceCue(metrics);
        recordTimelineSignals(metrics, score);
        updateDistanceWarning(metrics);
        updateHabitSignals(metrics);
        handlePosture(score);
        maybeRestCamera(score);
      }
    }
  }

  scheduleLoop();
}

function averageMetrics(metricsList) {
  const total = metricsList.reduce(
    (acc, metrics) => ({
      faceScale: acc.faceScale + metrics.faceScale,
      headDrop: acc.headDrop + metrics.headDrop,
      headForward: acc.headForward + metrics.headForward,
      headSideOffset: acc.headSideOffset + metrics.headSideOffset,
      handFaceProxy: acc.handFaceProxy + metrics.handFaceProxy,
      shoulderSlope: acc.shoulderSlope + metrics.shoulderSlope
    }),
    { faceScale: 0, headDrop: 0, headForward: 0, headSideOffset: 0, handFaceProxy: 0, shoulderSlope: 0 }
  );

  const count = metricsList.length || 1;
  return {
    faceScale: total.faceScale / count,
    headDrop: total.headDrop / count,
    headForward: total.headForward / count,
    headSideOffset: total.headSideOffset / count,
    handFaceProxy: total.handFaceProxy / count,
    shoulderSlope: total.shoulderSlope / count
  };
}

function calibrate() {
  if (samples.length < MIN_CALIBRATION_SAMPLES) {
    updateCalibrationReadiness();
    setStatus(
      `Hold still in view. Need ${MIN_CALIBRATION_SAMPLES - samples.length} more valid frames.`,
      "warn"
    );
    return;
  }

  baseline = averageMetrics(samples.slice(-MIN_CALIBRATION_SAMPLES));
  calibrated = true;
  leaningSince = null;
  resetCalibrationBtn.disabled = false;
  calibrateBtn.disabled = false;
  calibrateBtn.textContent = "Recalibrate upright";
  calibrationText.textContent = "Upright baseline set";
  calibrationBar.style.width = "100%";
  calibrationCard.className = "calibration-card done";
  calibrationHelp.textContent = "Calibrated. Press Recalibrate upright any time your sitting position or camera angle changes.";
  saveState();
  setStatus("Calibration saved. Monitoring forward lean.", "good");
}

function applyPreset(name) {
  const presets = {
    relaxed: { sensitivity: "70", delay: "5000" },
    normal: { sensitivity: "50", delay: "3000" },
    strict: { sensitivity: "40", delay: "1500" }
  };
  const preset = presets[name];
  if (!preset) return;
  setLeanThreshold(preset.sensitivity);
  delay.value = preset.delay;
  saveState();
}

function exportStats() {
  saveDailyStats();
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  const payload = { today: dailyStats, history };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `posture-vision-stats-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportHabits() {
  saveHabitStats();
  const blob = new Blob([JSON.stringify(habitStats, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `posture-vision-habits-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function resetHabits() {
  habitStats = emptyHabitStats();
  lastHabitEventAt = {};
  lastMetricsForHabits = null;
  saveHabitStats();
  renderHabitStats();
}

async function updateStartupStatus() {
  try {
    const response = await fetch("/startup/status");
    const payload = await response.json();
    startupText.textContent = payload.installed ? "Installed" : "Not installed";
  } catch {
    startupText.textContent = "Unavailable";
  }
}

async function updatePlatformInfo() {
  try {
    const response = await fetch("/platform");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    platformInfo = await response.json();
  } catch (error) {
    console.warn("Could not load platform capabilities", error);
    platformInfo = { mode: "unknown", label: "Unknown", capabilities: {} };
  }

  const capabilities = platformInfo.capabilities || {};
  minimizeTrayBtn.disabled = !capabilities.minimizeToTray;
  minimizeTrayBtn.title = capabilities.minimizeToTray
    ? `Minimize using ${platformInfo.label || "this platform"} integration`
    : "Minimize to tray is not supported on this platform/session.";

  installStartupBtn.disabled = !capabilities.startupIntegration;
  removeStartupBtn.disabled = !capabilities.startupIntegration;
  if (!capabilities.startupIntegration) {
    startupText.textContent = "Unsupported";
  }
}

async function updateVersion() {
  try {
    const response = await fetch("/version");
    const payload = await response.json();
    versionText.textContent = payload.version || "Unknown";
    aboutVersionText.textContent = payload.version || "Unknown";
  } catch {
    versionText.textContent = "Unavailable";
    aboutVersionText.textContent = "Unavailable";
  }
}

async function updateStorageStatus() {
  try {
    const response = await fetch("/storage/status");
    const payload = await response.json();
    const sizeKb = Math.max(1, Math.round((payload.sizeBytes || 0) / 1024));
    storageText.textContent = payload.exists ? `SQLite ${sizeKb} KB` : "SQLite ready";
    aboutStorageText.textContent = storageText.textContent;
  } catch {
    storageText.textContent = "Browser fallback";
    aboutStorageText.textContent = "Browser fallback";
  }
}

function renderRequirements(requirements) {
  requirementsList.innerHTML = "";
  requirements.forEach((requirement) => {
    const item = document.createElement("div");
    const state = requirement.ok === true ? "ok" : requirement.ok === false ? "bad" : "info";
    item.className = `requirement-item ${state}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(requirement.name)}</strong>
        <span>${escapeHtml(requirement.detail)}</span>
      </div>
      <b>${requirement.ok === true ? "Ready" : requirement.ok === false ? "Needs attention" : "Check when used"}</b>
    `;
    requirementsList.appendChild(item);
  });
}

async function updateRequirements() {
  try {
    const response = await fetch("/requirements");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderRequirements(payload.requirements || []);
  } catch {
    renderRequirements([
      {
        name: "Local server",
        ok: false,
        detail: "Could not load prerequisite status from the local server."
      }
    ]);
  }
}

async function backupDatabase() {
  try {
    saveState();
    saveDailyStats();
    saveHabitStats();
    const response = await fetch("/storage/backup", { method: "POST" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || `HTTP ${response.status}`);
    await updateStorageStatus();
    setStatus(`Backup saved: ${payload.backup}`, "good");
  } catch (error) {
    console.error(error);
    setStatus("Could not back up the local database.", "bad");
  }
}

async function exportLocalData() {
  try {
    saveState();
    saveDailyStats();
    saveHabitStats();
    const response = await fetch("/storage/export");
    const payload = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `posture-vision-data-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
    setStatus("Could not export local data.", "bad");
  }
}

async function exportDiagnostics() {
  try {
    const response = await fetch("/diagnostics");
    const payload = await response.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `posture-vision-diagnostics-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
    setStatus("Could not export diagnostics.", "bad");
  }
}

async function setStartupInstalled(installed) {
  if (!platformInfo.capabilities?.startupIntegration) {
    setStatus("Startup integration is not supported in this platform/session.", "warn");
    return;
  }

  try {
    const response = await fetch(installed ? "/startup/install" : "/startup/remove", { method: "POST" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await updateStartupStatus();
    setStatus(installed ? "Startup shortcut installed." : "Startup shortcut removed.", "good");
  } catch (error) {
    console.error(error);
    setStatus("Could not update startup integration. Use the platform install script if needed.", "bad");
  }
}

async function minimizeToTray() {
  if (!platformInfo.capabilities?.minimizeToTray) {
    setStatus("Minimize to tray is not supported in this platform/session.", "warn");
    return;
  }

  try {
    setStatus(`Minimizing with ${platformInfo.label || "platform"} integration.`, "neutral");
    const response = await fetch("/window/minimize", { method: "POST" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.minimized) {
      setStatus("Could not find a supported app window to minimize. Use the launcher for this platform/session.", "warn");
    }
  } catch (error) {
    console.error(error);
    setStatus("Could not minimize through the current platform integration.", "bad");
  }
}

function setPaused(value, source = "UI") {
  paused = value;
  leaningSince = null;
  updatePauseButton();
  saveState();
  setStatus(paused ? `Monitoring paused by ${source}.` : `Monitoring resumed by ${source}.`, "neutral");
}

async function pollControlCommands() {
  try {
    const response = await fetch("/control");
    if (!response.ok) return;
    const payload = await response.json();
    if (payload.pauseToggleSeq && payload.pauseToggleSeq !== lastPauseToggleSeq) {
      lastPauseToggleSeq = payload.pauseToggleSeq;
      setPaused(!paused, "tray");
    }
  } catch {
    // The control endpoint is available only through the local Python server.
  }
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});
tabsPrevBtn?.addEventListener("click", () => scrollTabs(-1));
tabsNextBtn?.addEventListener("click", () => scrollTabs(1));
tabs?.addEventListener("scroll", () => requestAnimationFrame(updateTabScrollButtons));
consentCheck.addEventListener("change", () => {
  acceptConsentBtn.disabled = !consentCheck.checked;
});
acceptConsentBtn.addEventListener("click", () => {
  if (!consentCheck.checked) return;
  persistString(CONSENT_KEY, "accepted");
  updateConsentModal();
  setStatus("Consent saved. Start camera when ready.", "neutral");
});
privacyBtn.addEventListener("click", () => {
  openPrivacyPolicy();
});
startBtn.addEventListener("click", startCamera);
pauseBtn.addEventListener("click", () => {
  setPaused(!paused);
});
calibrateBtn.addEventListener("click", calibrate);
resetCalibrationBtn.addEventListener("click", clearSavedCalibration);
resetStatsBtn.addEventListener("click", resetDailyStats);
exportStatsBtn.addEventListener("click", exportStats);
exportHabitsBtn.addEventListener("click", exportHabits);
resetHabitsBtn.addEventListener("click", resetHabits);
muteBtn.addEventListener("click", () => {
  muted = !muted;
  updateMuteButton();
  saveState();
  setStatus(muted ? "Meeting mode on. Visual alerts only." : "Meeting mode off. Voice and notifications enabled.", "neutral");
});
compactBtn.addEventListener("click", () => {
  compactView = !compactView;
  updateCompactButton();
  saveState();
});
minimizeTrayBtn.addEventListener("click", minimizeToTray);
presetSelect.addEventListener("change", () => {
  applyPreset(presetSelect.value);
});
snoozeSelect.addEventListener("change", () => {
  const duration = Number(snoozeSelect.value);
  snoozeUntil = duration ? performance.now() + duration : 0;
  saveState();
  setStatus(duration ? `Alerts snoozed for ${formatDuration(duration)}.` : "Alert snooze cleared.", "neutral");
});
announceNotifications.addEventListener("change", () => {
  updateMuteButton();
  saveState();
  setStatus(
    announceNotifications.value === "on" ? "Spoken announcements enabled." : "Spoken announcements disabled.",
    "neutral"
  );
});
testAnnouncementBtn.addEventListener("click", () => {
  forceNotifyUser("Posture Vision", "Spoken announcements are working.", { announce: true });
  setStatus("Test announcement sent to the tray helper.", "neutral");
});
profileSelect.addEventListener("change", () => {
  loadSelectedProfile();
  saveState();
});
saveProfileBtn.addEventListener("click", () => {
  if (!baseline) {
    setStatus("Calibrate before saving a profile.", "warn");
    return;
  }
  const name = prompt("Profile name", profileSelect.value === "default" ? "Desk" : profileSelect.value);
  if (!name) return;
  const profiles = loadProfiles();
  profiles[name] = { baseline, savedAt: new Date().toISOString() };
  saveProfiles(profiles);
  refreshProfileList(name);
  saveState();
  setStatus(`Saved calibration profile "${name}".`, "good");
});
deleteProfileBtn.addEventListener("click", () => {
  if (profileSelect.value === "default") return;
  const profiles = loadProfiles();
  delete profiles[profileSelect.value];
  saveProfiles(profiles);
  refreshProfileList("default");
  saveState();
  setStatus("Calibration profile deleted.", "neutral");
});
cameraMode.addEventListener("change", async () => {
  clearTimeout(periodicTimer);

  if (cameraMode.value === "continuous") {
    if (cameraSleeping && calibrated) {
      try {
        cameraState.textContent = "Starting continuous monitoring...";
        await openCameraStream();
        setStatus("Continuous monitoring is active. The webcam LED stays on while monitoring.", "neutral");
        if (!loopStarted) {
          loopStarted = true;
          scheduleLoop();
        }
      } catch (error) {
        console.error(error);
        setStatus(describeStartupError(error), "bad");
      }
    } else if (calibrated) {
      setStatus("Continuous monitoring is active. The webcam LED stays on while monitoring.", "neutral");
    }
    return;
  }

  if (calibrated) {
    activeCheckStartedAt = performance.now();
    setStatus("Periodic privacy checks are active. The camera will turn off between checks.", "neutral");
  }
  saveState();
});
autoStartCamera.addEventListener("change", saveState);
sensitivity.addEventListener("input", () => setLeanThreshold(sensitivity.value));
sensitivity.addEventListener("change", () => setLeanThreshold(sensitivity.value, { markCustom: true, persist: true }));
leanThresholdNumber.addEventListener("input", () => {
  if (leanThresholdNumber.value === "") return;
  setLeanThreshold(leanThresholdNumber.value);
});
leanThresholdNumber.addEventListener("change", () => setLeanThreshold(leanThresholdNumber.value, { markCustom: true, persist: true }));
delay.addEventListener("change", saveState);
cameraSelect.addEventListener("change", async () => {
  saveState();

  if (!hasCameraStarted || cameraSleeping) return;

  stopCameraStream();
  lastVideoTime = -1;
  samples = [];
  calibrated = false;
  baseline = null;
  resetCalibrationBtn.disabled = true;
  calibrateBtn.disabled = true;
  calibrateBtn.textContent = "Calibrate upright";
  calibrationText.textContent = `0/${MIN_CALIBRATION_SAMPLES} frames`;
  calibrationBar.style.width = "0%";
  calibrationCard.className = "calibration-card idle";
  calibrationHelp.textContent = "Camera changed. Sit upright and recalibrate.";

  try {
    await openCameraStream();
    setStatus("Camera changed. Recalibrate while seated upright.", "neutral");
    if (!loopStarted) {
      loopStarted = true;
      scheduleLoop();
    }
  } catch (error) {
    console.error(error);
    setStatus(describeStartupError(error), "bad");
  }
});
checkInterval.addEventListener("change", saveState);
installStartupBtn.addEventListener("click", () => setStartupInstalled(true));
removeStartupBtn.addEventListener("click", () => setStartupInstalled(false));
diagnosticsBtn.addEventListener("click", exportDiagnostics);
privacyLinkBtn.addEventListener("click", openPrivacyPolicy);
aboutPrivacyBtn.addEventListener("click", openPrivacyPolicy);
aboutDiagnosticsBtn.addEventListener("click", exportDiagnostics);
backupDataBtn.addEventListener("click", backupDatabase);
exportDataBtn.addEventListener("click", exportLocalData);
closePrivacyBtn.addEventListener("click", closePrivacyPolicy);
privacyModal.addEventListener("click", (event) => {
  if (event.target === privacyModal) closePrivacyPolicy();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePrivacyPolicy();
});
autoLockDelay.addEventListener("change", () => {
  absenceStartedAt = null;
  lockRequested = false;
  saveState();
  if (autoLockDelay.value !== "0" && cameraMode.value !== "continuous") {
    setStatus("Auto-lock needs continuous monitoring. Switch Camera mode to Continuous monitoring.", "warn");
  }
});
breakInterval.addEventListener("change", () => {
  seatedSinceBreakAt = null;
  lastBreakReminderAt = 0;
  saveState();
});
quietHoursEnabled.addEventListener("change", () => {
  updateMuteButton();
  saveState();
});
quietStart.addEventListener("change", () => {
  updateMuteButton();
  saveState();
});
quietEnd.addEventListener("change", () => {
  updateMuteButton();
  saveState();
});
distanceWarning.addEventListener("change", saveState);
habitTracking.addEventListener("change", () => {
  saveState();
  renderHabitStats();
});
expressionTracking.addEventListener("change", saveState);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", updateTabScrollButtons);
window.addEventListener("beforeunload", () => {
  if (dailyStats) saveDailyStats();
});

async function initializeApp() {
  await hydrateFromServer();
  loadDailyStats();
  loadHabitStats();
  refreshProfileList();
  loadState();
  updateConsentModal();
  updatePauseButton();
  updateMuteButton();
  updateCompactButton();
  await updatePlatformInfo();
  updateStartupStatus();
  updateVersion();
  updateStorageStatus();
  updateRequirements();
  setInterval(pollControlCommands, 1500);
  setInterval(updateMuteButton, 60000);
  setInterval(updateStorageStatus, 60000);
  await refreshCameraList().catch((error) => console.warn("Could not list cameras", error));
  updateTabScrollButtons();
  autoStartCameraIfEnabled();
}

initializeApp();
