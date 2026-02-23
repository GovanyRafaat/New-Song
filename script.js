let songs = [];
let currentFontColor = "#ffffff";
let currentShadow = false;

/* تحميل البيانات */
async function loadSongs() {
  try {
    const response = await fetch("tasbe7naDB.json");
    songs = await response.json();
    songs = songs.map(s => prepareSearchFields(s));
    displaySongs([]);
  } catch (error) {
    console.log("فشل تحميل JSON");
  }
}

loadSongs();

/* عرض الترانيم */

function displaySongs(list) {
  const container = document.getElementById("songsContainer");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "";
    return;
  }

  list.forEach(song => {
    const div = document.createElement("div");
    div.className = "song";

    const title = song.title || song.name || "ترنيمة";
    div.textContent = title;

    div.style.color = "#000000";
    div.style.textShadow = "none";

    div.addEventListener("click", function () {
      openPresentation(song);
    });

    container.appendChild(div);
  });
}

/* البحث الفوري */

document.getElementById("searchInput").addEventListener("input", function () {
  const value = this.value.trim().toLowerCase();

  if (value.length === 0) {
    displaySongs([]);
    return;
  }
  let q = normalizeArabic(value);
  q = expandAbbreviations(q);
  const matches = songs.filter(s => s._searchText.includes(q));
  displaySongs(matches);
});

/* القائمة */

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  menu.classList.toggle("active");
}

/* قفل القائمة لو ضغطت بره */

document.addEventListener("click", function(e) {
  const menu = document.getElementById("sideMenu");
  const button = document.querySelector(".menu-icon");

  if (!menu.contains(e.target) && !button.contains(e.target)) {
    menu.classList.remove("active");
  }
});

/* فتح إعدادات العرض */

function toggleDisplayOptions() {
  document.getElementById("displayOptions").classList.toggle("active");
}

/* نوع العرض */

document.getElementById("viewMode").addEventListener("change", function () {
  if (this.value === "single") {
    document.body.classList.add("single-line");
  } else {
    document.body.classList.remove("single-line");
  }
  updatePresentationFormatting();
});

/* الخلفية */

document.getElementById("bgColor").addEventListener("change", function () {

  document.body.classList.remove("white-bg", "black-bg");

  if (this.value === "black") {
    document.body.classList.add("black-bg");
  } else {
    document.body.classList.add("white-bg");
  }

  updatePresentationFormatting();
});

/* ظل النص */

document.getElementById("textShadowToggle").addEventListener("change", function () {
  currentShadow = this.checked;
  displaySongs(songs);
  updatePresentationFormatting();
});

/* لون الخط */

document.getElementById("fontColor").addEventListener("input", function () {
  currentFontColor = this.value;
  displaySongs(songs);
  updatePresentationFormatting();
});

let currentSong = null;
let currentLines = [];
let activeIndex = 0;
let numberBuffer = "";
let numberBufferTimer = null;

const presentationEl = document.getElementById("presentation");
const hymnContainer = document.getElementById("hymnContainer");
const lineDisplay = document.getElementById("lineDisplay");
const presentationTitle = document.getElementById("presentationTitle");

function getSongLines(song) {
  const lines = [];
  const chorus = Array.isArray(song.chorus) ? song.chorus : [];
  const verses = Array.isArray(song.verses) ? song.verses : [];
  if (song.chorusFirst && chorus.length) {
    chorus.forEach(l => {
      l.split(/\r?\n/).forEach(t => { const s = t.trim(); if (s) lines.push(s); });
    });
  }
  verses.forEach(v => {
    if (Array.isArray(v)) {
      v.forEach(l => {
        l.split(/\r?\n/).forEach(t => { const s = t.trim(); if (s) lines.push(s); });
      });
    } else if (typeof v === "string") {
      v.split(/\r?\n/).forEach(t => { const s = t.trim(); if (s) lines.push(s); });
    }
    if (chorus.length) {
      chorus.forEach(l => {
        l.split(/\r?\n/).forEach(t => { const s = t.trim(); if (s) lines.push(s); });
      });
    }
  });
  if (!verses.length && chorus.length) {
    chorus.forEach(l => {
      l.split(/\r?\n/).forEach(t => { const s = t.trim(); if (s) lines.push(s); });
    });
  }
  return lines;
}

function normalizeArabic(str) {
  return str
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[آأإا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ABBR = (() => {
  const map = {
    "مز": "مزمور",
    "مر": "مرقس",
    "مت": "متى",
    "لو": "لوقا",
    "يو": "يوحنا",
    "اع": "اعمال",
    "رو": "رومية",
    "غل": "غلاطية",
    "اف": "افسس",
    "في": "فيلبي",
    "كو": "كورنثوس",
    "يع": "يعقوب",
    "بط": "بطرس",
    "رؤ": "رؤيا"
  };
  const out = {};
  for (const [k,v] of Object.entries(map)) {
    out[normalizeArabic(k)] = normalizeArabic(v);
  }
  // numeric variants
  out["1كو"] = normalizeArabic("1 كورنثوس");
  out["2كو"] = normalizeArabic("2 كورنثوس");
  out["1يو"] = normalizeArabic("1 يوحنا");
  out["2يو"] = normalizeArabic("2 يوحنا");
  out["3يو"] = normalizeArabic("3 يوحنا");
  out["1بط"] = normalizeArabic("1 بطرس");
  out["2بط"] = normalizeArabic("2 بطرس");
  return out;
})();

function expandAbbreviations(q) {
  const tokens = q.split(" ").filter(Boolean);
  const expanded = tokens.map(tok => {
    // direct match
    if (ABBR[tok]) return ABBR[tok];
    // prefix with digits e.g., "مز23" -> "مزمور 23"
    const m = tok.match(/^([^\d]+)(\d[\d:]*)$/);
    if (m && ABBR[m[1]]) {
      return ABBR[m[1]] + " " + m[2].replace(/:/g, " ");
    }
    return tok;
  });
  return expanded.join(" ").trim();
}

function prepareSearchFields(song) {
  const title = song.title || song.name || "";
  let text = title + " ";
  const chorus = Array.isArray(song.chorus) ? song.chorus : [];
  const verses = Array.isArray(song.verses) ? song.verses : [];
  chorus.forEach(c => { text += " " + c; });
  verses.forEach(v => {
    if (Array.isArray(v)) {
      v.forEach(l => { text += " " + l; });
    } else {
      text += " " + v;
    }
  });
  return {
    ...song,
    _searchTitle: normalizeArabic(title),
    _searchText: normalizeArabic(text)
  };
}
function openPresentation(song) {
  currentSong = song;
  currentLines = getSongLines(song);
  activeIndex = 0;
  presentationTitle.textContent = song.title || song.name || "";
  lineDisplay.textContent = currentLines[activeIndex] || "";
  presentationEl.classList.add("active");
  updatePresentationFormatting();
}

function closePresentation() {
  presentationEl.classList.remove("active");
  currentSong = null;
  currentLines = [];
  activeIndex = 0;
}

function setActive(idx) {
  activeIndex = Math.max(0, Math.min(currentLines.length - 1, idx));
  lineDisplay.textContent = currentLines[activeIndex] || "";
}

function nextLine() {
  setActive(activeIndex + 1);
}

function prevLine() {
  setActive(activeIndex - 1);
}

function scrollActiveIntoView() {}

function updatePresentationFormatting() {
  if (!presentationEl.classList.contains("active")) return;

  // لون الخلفية للعرض فقط
  const bgSelect = document.getElementById("bgColor").value;

if (bgSelect === "black") {
  presentationEl.style.background = "#000000";
} else if (bgSelect === "white") {
  presentationEl.style.background = "#ffffff";
} else if (bgSelect === "green") {
  presentationEl.style.background = "#00ff00"; // جرين سكرين صافي
}

  // لون الخط
  lineDisplay.style.color = currentFontColor;

  // ظل النص
  lineDisplay.style.textShadow =
    currentShadow ? "2px 2px 5px black" : "none";

  // نوع العرض
  const viewMode = document.getElementById("viewMode").value;

  if (viewMode === "single") {
    lineDisplay.style.whiteSpace = "nowrap";
    lineDisplay.style.fontSize = "15vh";
  } else {
    lineDisplay.style.whiteSpace = "pre-wrap";
    lineDisplay.style.fontSize = "12vh";
  }
}

window.addEventListener("keydown", function (e) {
  if (!presentationEl.classList.contains("active")) return;
  if (/^[0-9]$/.test(e.key)) {
    numberBuffer += e.key;
    if (numberBufferTimer) clearTimeout(numberBufferTimer);
    numberBufferTimer = setTimeout(() => { numberBuffer = ""; }, 3000);
    return;
  }
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    nextLine();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    prevLine();
  } else if (e.key === "Enter") {
    if (numberBuffer.length) {
      const n = parseInt(numberBuffer, 10);
      numberBuffer = "";
      if (!isNaN(n)) {
        // 1-based slide numbering
        setActive(n - 1);
      }
    } else {
      nextLine();
    }
  } else if (e.key === "Escape") {
    closePresentation();
  }
});
