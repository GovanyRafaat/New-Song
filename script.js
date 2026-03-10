let songs = [];
let bible = [];
let currentFontColor = "#ffffff";
let currentShadow = false;

/* تحميل البيانات */
async function loadData() {
  try {
    const responseSongs = await fetch("tasbe7naDB.json");
    songs = await responseSongs.json();
    songs = songs.map(s => prepareSearchFields(s));
    
    const responseBible = await fetch("bible.json");
    bible = await responseBible.json();
    
    displayResults([]);
  } catch (error) {
    console.log("فشل تحميل البيانات", error);
  }
}

loadData();

/* عرض النتائج */

function displayResults(list) {
  const container = document.getElementById("songsContainer");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "";
    return;
  }

  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "song";

    // إذا كان العنصر من الكتاب المقدس
    if (item.isBible) {
      div.textContent = `${item.bookName} ${item.chapterNumber}`;
      div.addEventListener("click", function () {
        openBiblePresentation(item);
      });
    } else {
      const title = item.title || item.name || "ترنيمة";
      div.textContent = title;
      div.addEventListener("click", function () {
        openPresentation(item);
      });
    }

    div.style.color = "#000000";
    div.style.textShadow = "none";

    container.appendChild(div);
  });
}

/* البحث الفوري */

document.getElementById("searchInput").addEventListener("input", function () {
  const value = this.value.trim().toLowerCase();

  if (value.length === 0) {
    displayResults([]);
    return;
  }

  let q = normalizeArabic(value);
  let expandedQ = expandAbbreviations(q);
  
  // 1. بحث في الترانيم
  const hymnMatches = songs
    .map(song => {
      const index = song._searchText.indexOf(expandedQ);
      if (index !== -1) {
        return { ...song, _matchIndex: index };
      }
      return null;
    })
    .filter(Boolean);

  // 2. بحث في الكتاب المقدس (كتب وأصحاحات)
  const bibleMatches = [];
  const bibleQueryTokens = expandedQ.split(" ").filter(Boolean);
  
  if (bibleQueryTokens.length > 0) {
    const bookSearchName = bibleQueryTokens[0];
    const chapterSearchNumber = bibleQueryTokens[1] ? parseInt(bibleQueryTokens[1]) : null;

    bible.forEach(testament => {
      testament.books.forEach(book => {
        const normalizedBookName = normalizeArabic(book.name);
        
        // إذا كان اسم الكتاب يبدأ بالكلمة الأولى في البحث
        if (normalizedBookName.startsWith(bookSearchName)) {
          if (chapterSearchNumber !== null) {
            // إذا تم تحديد رقم أصحاح
            const chapter = book.chapters.find(c => c.number === chapterSearchNumber);
            if (chapter) {
              bibleMatches.push({
                isBible: true,
                bookName: book.name,
                chapterNumber: chapter.number,
                verses: chapter.verses
              });
            }
          } else {
            // إذا لم يتم تحديد أصحاح، أظهر كل الأصحاحات المتاحة لهذا الكتاب (كأمثلة أو الكل؟)
            // لنظهر أول 5 أصحاحات مثلاً لتجنب الزحمة، أو الأصحاح الأول فقط
            book.chapters.slice(0, 5).forEach(chapter => {
              bibleMatches.push({
                isBible: true,
                bookName: book.name,
                chapterNumber: chapter.number,
                verses: chapter.verses
              });
            });
          }
        }
      });
    });
  }

  displayResults([...bibleMatches, ...hymnMatches]);
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

let viewMode = "single"; // 'single' or 'slides'

const singleModeBtn = document.getElementById("viewModeSingle");
const slidesModeBtn = document.getElementById("viewModeSlides");

singleModeBtn.addEventListener("click", () => {
  if (viewMode === "single") return;
  viewMode = "single";
  singleModeBtn.classList.add("selected");
  slidesModeBtn.classList.remove("selected");
  if (currentSong) openPresentation(currentSong);
  else if (currentBibleItem) openBiblePresentation(currentBibleItem);
});

slidesModeBtn.addEventListener("click", () => {
  if (viewMode === "slides") return;
  viewMode = "slides";
  slidesModeBtn.classList.add("selected");
  singleModeBtn.classList.remove("selected");
  if (currentSong) openPresentation(currentSong);
  else if (currentBibleItem) openBiblePresentation(currentBibleItem);
});

/* الخلفية */

document.getElementById("bgColor").addEventListener("change", function () {
  document.body.classList.remove("white-bg", "black-bg", "green-bg");

  if (this.value === "black") {
    document.body.classList.add("black-bg");
  } else if (this.value === "white") {
    document.body.classList.add("white-bg");
  } else if (this.value === "green") {
    document.body.classList.add("green-bg");
  }

  updatePresentationFormatting();
});

/* ظل النص */

document.getElementById("textShadowToggle").addEventListener("change", function () {
  currentShadow = this.checked;
  // Use the search input value to refresh results if needed, or just clear
  const searchVal = document.getElementById("searchInput").value;
  if (searchVal) {
    document.getElementById("searchInput").dispatchEvent(new Event('input'));
  }
  updatePresentationFormatting();
});

/* لون الخط */

document.getElementById("fontColor").addEventListener("input", function () {
  currentFontColor = this.value;
  updatePresentationFormatting();
});

let currentSong = null;
let currentBibleItem = null;
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
function openBiblePresentation(bibleItem) {
  currentBibleItem = bibleItem;
  currentSong = null; // حتى لا تتعارض مع الترانيم
  const slides = [];

  // دالة مساعدة لتقسيم النص لـ 4 كلمات
  function splitToFourWords(text) {
    if (!text) return [];
    const cleanText = text.replace(/\s+/g, " ").trim();
    const words = cleanText.split(" ").filter(Boolean);
    const result = [];
    for (let i = 0; i < words.length; i += 4) {
      result.push(words.slice(i, i + 4).join(" "));
    }
    return result;
  }

  // إذا كان نوع العرض "شرائح"، تظهر كل آية في شريحة مستقلة
  if (viewMode === "slides") {
    bibleItem.verses.forEach(v => {
      slides.push(`(${v.number}) ${v.text}`);
    });
  } else {
    // وضع "سطر واحد" = 4 كلمات لكل شريحة
    bibleItem.verses.forEach(v => {
      const verseText = `(${v.number}) ${v.text}`;
      const chunks = splitToFourWords(verseText);
      chunks.forEach(c => slides.push(c));
    });
  }

  currentLines = slides;
  activeIndex = 0;

  presentationTitle.textContent = `${bibleItem.bookName} ${bibleItem.chapterNumber}`;
  lineDisplay.textContent = currentLines[activeIndex] || "";
  presentationEl.classList.add("active");
  updatePresentationFormatting();
}

function openPresentation(song) {
  currentSong = song;
  currentBibleItem = null; // حتى لا تتعارض مع الكتاب المقدس
  const slides = [];

  // Helper to split text into EXACTLY 4 words per chunk
  function splitToFourWords(text) {
    if (!text) return [];
    const cleanText = text.replace(/\s+/g, " ").trim();
    const words = cleanText.split(" ").filter(Boolean);
    const result = [];
    for (let i = 0; i < words.length; i += 4) {
      result.push(words.slice(i, i + 4).join(" "));
    }
    return result;
  }

  // Helper to format text with 6 words per line
  function formatSixWordsPerLine(text) {
    if (!text) return "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines = [];
    for (let i = 0; i < words.length; i += 6) {
      lines.push(words.slice(i, i + 6).join(" "));
    }
    return lines.join("\n");
  }

  // Helper to add a section (verse or chorus)
  function addSection(section) {
    if (!section) return;
    let text = "";
    if (Array.isArray(section)) {
      text = section.join(" ");
    } else {
      text = section;
    }

    if (!text.trim()) return;

    if (viewMode === "slides") {
      // Slides mode: One bracket (section) = One slide
      // Apply 6-word per line formatting
      slides.push(formatSixWordsPerLine(text));
    } else {
      // Single Line mode: Exactly 4 words per slide
      const chunks = splitToFourWords(text);
      chunks.forEach(c => slides.push(c));
    }
  }

  const chorus = Array.isArray(song.chorus) ? song.chorus : [];
  const verses = Array.isArray(song.verses) ? song.verses : [];

  // Presentation order
  if (song.chorusFirst && chorus.length) {
    chorus.forEach(c => addSection(c));
  }

  verses.forEach(v => {
    addSection(v);
    if (chorus.length) {
      chorus.forEach(c => addSection(c));
    }
  });

  if (!verses.length && !song.chorusFirst && chorus.length) {
    chorus.forEach(c => addSection(c));
  }

  currentLines = slides;
  activeIndex = 0;

  // Search matching to start at the right slide
  const searchInput = document.getElementById("searchInput");
  if (searchInput && searchInput.value.trim()) {
    const q = normalizeArabic(searchInput.value.trim());
    const foundIndex = currentLines.findIndex(l => normalizeArabic(l).includes(q));
    if (foundIndex !== -1) {
      activeIndex = foundIndex;
    }
  }

  presentationTitle.textContent = song.title || song.name || "";
  lineDisplay.textContent = currentLines[activeIndex] || "";
  presentationEl.classList.add("active");
  updatePresentationFormatting();
}

function closePresentation() {
  presentationEl.classList.remove("active");
  currentSong = null;
  currentBibleItem = null;
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

  // لون الخلفية
  const bgSelect = document.getElementById("bgColor").value;
  if (bgSelect === "black") {
    presentationEl.style.backgroundColor = "#000000";
  } else if (bgSelect === "white") {
    presentationEl.style.backgroundColor = "#ffffff";
  } else if (bgSelect === "green") {
    presentationEl.style.backgroundColor = "#00ff00";
  }

  // لون الخط
  lineDisplay.style.color = currentFontColor;

  // ظل النص
  lineDisplay.style.textShadow = currentShadow ? "2px 2px 5px rgba(0,0,0,0.8)" : "none";

  // نوع العرض (تعديل الحجم والمسافات)
  if (viewMode === "single") {
    lineDisplay.style.fontSize = "15vh";
    lineDisplay.style.whiteSpace = "pre-wrap"; 
  } else {
    lineDisplay.style.fontSize = "12vh";
    lineDisplay.style.whiteSpace = "pre-wrap";
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
