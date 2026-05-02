/**
 * PREP-LITE — CBT Platform JavaScript
 * Nigerian Secondary School Students
 * Features: Practice Mode, Exam Mode, Timer, Review, Results
 */

// ═══════════════════════════════════════════════════════
// MIT APP INVENTOR COMPATIBILITY
// ═══════════════════════════════════════════════════════

// Detect if running in MIT App Inventor
const isMITAppInventor = () => {
  return typeof AppInventor !== 'undefined' || 
         navigator.userAgent.includes('MIT') ||
         window.location.href.includes('file://');
};

// Force compatibility mode for MIT
if (isMITAppInventor()) {
  console.log('Running in MIT App Inventor - compatibility mode enabled');
  // Make all functions globally accessible
  window.goHome = function() {
    try {
      if (state.timerInterval) clearInterval(state.timerInterval);
      clearSession();
      resetState();
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('screen-landing').classList.add('active');
    } catch(e) { console.error(e); }
  };
}

// ═══════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════

const SUBJECTS = [
  { key: 'english',              label: 'English Language' },
  { key: 'mathematics',         label: 'Mathematics' },
  { key: 'biology',             label: 'Biology' },
  { key: 'chemistry',           label: 'Chemistry' },
  { key: 'physics',             label: 'Physics' },
  { key: 'economics',           label: 'Economics' },
  { key: 'government',          label: 'Government' },
  { key: 'commerce',            label: 'Commerce' },
  { key: 'literature',          label: 'Literature' },
  { key: 'geography',           label: 'Geography' },
  { key: 'further-mathematics', label: 'Further Mathematics' },
  { key: 'food-nutrition',      label: 'Food & Nutrition' },
  { key: 'financial-accounting',label: 'Financial Accounting' },
  { key: 'civic-education',     label: 'Civic Education' },
  { key: 'christian-studies',   label: 'Christian Studies' },
  { key: 'agricultural-science',label: 'Agricultural Science' },
  { key: 'computer-hardware',   label: 'Computer Hardware' },
  { key: 'digital-technology',  label: 'Digital Technology' },
];

const LETTERS = ['A', 'B', 'C', 'D'];

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

let state = {
  mode: null,           // 'practice' | 'exam'
  practiceType: null,   // 'single' | 'multiple'
  timerMinutes: 0,
  questions: [],        // [{text, options:[...], correctIndex, subject}]
  answers: {},          // {questionIndex: selectedOptionIndex}
  flagged: new Set(),
  currentIndex: 0,
  timerInterval: null,
  secondsLeft: 0,
  startTime: null,
  endTime: null,
  examSubjects: [],     // subjects chosen (incl english)
  warned10: false, warned5: false, warned1: false,
};

// Practice setup temp state
let practiceConfig = {
  type: null,
  singleSubject: null,
  multipleSubjects: [],
  timerMins: null,
};

// Exam setup temp state
let examConfig = {
  subjects: [],  // 3 chosen (english is auto)
};

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  setupLanding();
  setupBeforeUnload();
  tryRestoreSession();
});

// Fallback for MIT App Inventor WebViewer
window.addEventListener('load', () => {
  if (!document.getElementById('btnPractice').onclick) {
    loadTheme();
    setupLanding();
    setupBeforeUnload();
    tryRestoreSession();
  }
  
  // Ensure back buttons are properly wired for MIT App Inventor
  const backButtons = document.querySelectorAll('.back-btn');
  backButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const onclickAttr = this.getAttribute('onclick');
      if (onclickAttr) {
        try {
          // Execute the onclick attribute
          new Function(onclickAttr).call(this);
        } catch(err) {
          console.error('Error executing onclick:', err);
        }
      }
    });
  });
  
  // Ensure submit/home buttons are properly wired
  const homeButtons = document.querySelectorAll('[onclick*="goHome"]');
  homeButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      try {
        goHome();
      } catch(err) {
        console.error('Error in goHome:', err);
      }
    });
  });
});

function setupLanding() {
  const btnPractice = document.getElementById('btnPractice');
  const btnExam = document.getElementById('btnExam');
  const themeToggle = document.getElementById('themeToggle');
  
  if (btnPractice) {
    btnPractice.addEventListener('click', openPracticeSetup);
    btnPractice.onclick = openPracticeSetup;
  }
  if (btnExam) {
    btnExam.addEventListener('click', openExamSetup);
    btnExam.onclick = openExamSetup;
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.onclick = toggleTheme;
  }
}

function setupBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    if (state.mode && state.timerInterval) {
      e.preventDefault();
      e.returnValue = 'Exam in progress. Are you sure you want to leave?';
    }
  });
}

// ═══════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════

function loadTheme() {
  const saved = localStorage.getItem('preplite-theme') || 'dark';
  document.body.setAttribute('data-theme', saved);
  updateThemeIcons(saved);
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('preplite-theme', next);
  updateThemeIcons(next);
}

function updateThemeIcons(theme) {
  document.querySelectorAll('.theme-icon').forEach(el => {
    el.textContent = theme === 'dark' ? '☀' : '☽';
  });
}

// ═══════════════════════════════════════════════════════
// SCREEN NAVIGATION
// ═══════════════════════════════════════════════════════

function showScreen(id) {
  try {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      // MIT App Inventor compatible scroll
      try {
        window.scrollTo(0, 0);
      } catch(e) {
        // Fallback if scrollTo fails
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
      }
    }
  } catch(e) {
    console.error('Error showing screen:', e);
  }
}

function goHome() {
  try {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    clearSession();
    resetState();
    showScreen('screen-landing');
  } catch(e) {
    console.error('Error going home:', e);
    // Force screen change even if error
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const landing = document.getElementById('screen-landing');
    if (landing) landing.classList.add('active');
  }
}

// ═══════════════════════════════════════════════════════
// PRACTICE SETUP
// ═══════════════════════════════════════════════════════

function openPracticeSetup() {
  practiceConfig = { type: null, singleSubject: null, multipleSubjects: [], timerMins: null };
  showScreen('screen-practice-setup');
  buildSingleSubjectDropdown();
  buildMultiSubjectGrid();
  document.getElementById('singleConfig').classList.add('hidden');
  document.getElementById('multipleConfig').classList.add('hidden');
  document.getElementById('timerConfig').classList.add('hidden');
  document.getElementById('btnStartPractice').disabled = true;
  // Clear selections
  document.querySelectorAll('#screen-practice-setup .mode-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
}

function buildSingleSubjectDropdown() {
  const sel = document.getElementById('singleSubject');
  sel.innerHTML = '<option value="">— Select Subject —</option>' +
    SUBJECTS.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  sel.addEventListener('change', () => {
    practiceConfig.singleSubject = sel.value || null;
    checkPracticeReady();
  });
}

function buildMultiSubjectGrid() {
  const grid = document.getElementById('multiSubjectGrid');
  grid.innerHTML = SUBJECTS.map(s =>
    `<div class="subject-chip" data-key="${s.key}" onclick="toggleMultiSubject('${s.key}', this)">${s.label}</div>`
  ).join('');
}

function toggleMultiSubject(key, el) {
  const idx = practiceConfig.multipleSubjects.indexOf(key);
  if (idx > -1) {
    practiceConfig.multipleSubjects.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    if (practiceConfig.multipleSubjects.length >= 4) return; // max 4
    practiceConfig.multipleSubjects.push(key);
    el.classList.add('selected');
  }
  // Disable non-selected when 4 selected
  document.querySelectorAll('#multiSubjectGrid .subject-chip').forEach(chip => {
    if (!chip.classList.contains('selected')) {
      chip.classList.toggle('disabled', practiceConfig.multipleSubjects.length >= 4);
    }
  });
  document.getElementById('selectedCount').textContent = practiceConfig.multipleSubjects.length;
  checkPracticeReady();
}

function selectPracticeType(type) {
  practiceConfig.type = type;
  document.getElementById('cardSingle').classList.toggle('selected', type === 'single');
  document.getElementById('cardMultiple').classList.toggle('selected', type === 'multiple');
  document.getElementById('singleConfig').classList.toggle('hidden', type !== 'single');
  document.getElementById('multipleConfig').classList.toggle('hidden', type !== 'multiple');
  document.getElementById('timerConfig').classList.remove('hidden');
  checkPracticeReady();
}

function setTimer(mins) {
  practiceConfig.timerMins = mins;
  document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.timer-btn').forEach(b => {
    if (b.textContent === mins + ' min') b.classList.add('active');
  });
  document.getElementById('customTimerInput').classList.add('hidden');
  document.getElementById('timerDisplay').textContent = `⏱ ${mins} minute${mins !== 1 ? 's' : ''} selected`;
  checkPracticeReady();
}

function showCustomTimer() {
  document.getElementById('customTimerInput').classList.remove('hidden');
  document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.custom-timer-btn').classList.add('active');
  practiceConfig.timerMins = null;
  checkPracticeReady();
}

function applyCustomTimer() {
  const v = parseInt(document.getElementById('customMinutes').value);
  if (!v || v < 1 || v > 180) {
    alert('Please enter a valid number between 1 and 180.');
    return;
  }
  practiceConfig.timerMins = v;
  document.getElementById('timerDisplay').textContent = `⏱ ${v} minute${v !== 1 ? 's' : ''} selected`;
  checkPracticeReady();
}

function checkPracticeReady() {
  const { type, singleSubject, multipleSubjects, timerMins } = practiceConfig;
  let ready = false;
  if (type === 'single' && singleSubject && timerMins) ready = true;
  if (type === 'multiple' && multipleSubjects.length === 4 && timerMins) ready = true;
  document.getElementById('btnStartPractice').disabled = !ready;
}

// ═══════════════════════════════════════════════════════
// EXAM SETUP
// ═══════════════════════════════════════════════════════

function openExamSetup() {
  examConfig = { subjects: [] };
  showScreen('screen-exam-setup');
  buildExamSubjectGrid();
  document.getElementById('examSelectedCount').textContent = '0';
  document.getElementById('btnStartExam').disabled = true;
}

function buildExamSubjectGrid() {
  const grid = document.getElementById('examSubjectGrid');
  // English is excluded from this list (compulsory, auto-added)
  const available = SUBJECTS.filter(s => s.key !== 'english');
  grid.innerHTML = available.map(s =>
    `<div class="subject-chip" data-key="${s.key}" onclick="toggleExamSubject('${s.key}', this)">${s.label}</div>`
  ).join('');
}

function toggleExamSubject(key, el) {
  const idx = examConfig.subjects.indexOf(key);
  if (idx > -1) {
    examConfig.subjects.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    if (examConfig.subjects.length >= 3) return;
    examConfig.subjects.push(key);
    el.classList.add('selected');
  }
  document.querySelectorAll('#examSubjectGrid .subject-chip').forEach(chip => {
    if (!chip.classList.contains('selected')) {
      chip.classList.toggle('disabled', examConfig.subjects.length >= 3);
    }
  });
  document.getElementById('examSelectedCount').textContent = examConfig.subjects.length;
  document.getElementById('btnStartExam').disabled = examConfig.subjects.length < 3;
}

// ═══════════════════════════════════════════════════════
// EMBEDDED QUESTIONS DATABASE (for MIT App Inventor)
// ═══════════════════════════════════════════════════════

const QUESTIONS_DB = {
  english: [
    {question: "Which of the following is a synonym for 'benevolent'?", options: ["malicious", "kind", "ignorant", "proud"], answer: 1},
    {question: "Identify the grammatically correct sentence.", options: ["She don't like apples", "She doesn't likes apples", "She don't likes apples", "She doesn't like apples"], answer: 3},
    {question: "What is the main idea of the passage about climate change?", options: ["Weather is unpredictable", "Global warming affects ecosystems", "Temperature rises only in summer", "Ice melts in all seasons"], answer: 1},
    {question: "Choose the word that best completes the sentence: 'He spoke with _____ about his experience.'", options: ["elegance", "elegantly", "elegant", "elegancy"], answer: 1},
    {question: "What is the antonym of 'verbose'?", options: ["lengthy", "concise", "wordy", "detailed"], answer: 1},
    {question: "Which sentence demonstrates correct use of the semicolon?", options: ["She wanted to go; but he refused", "She wanted to go; however, he refused", "She wanted to go, however; he refused", "She wanted to go: however he refused"], answer: 1},
    {question: "What does 'metaphor' mean?", options: ["A direct comparison", "An indirect comparison", "A repetition of sounds", "An exaggeration"], answer: 1},
    {question: "Choose the correctly punctuated option.", options: ["Its a beautiful day isn't it", "It's a beautiful day, isn't it?", "Its' a beautiful day, isnt it", "It's a beautiful day isn't it."], answer: 1},
    {question: "What is the plural of 'child'?", options: ["childs", "childes", "children", "childer"], answer: 2},
    {question: "Which word is spelled correctly?", options: ["neccessary", "necessary", "necesary", "neccesserry"], answer: 1},
    {question: "Identify the adjective in the sentence: 'The quick brown fox jumps over the lazy dog.'", options: ["quick and lazy", "fox and dog", "jumps", "over"], answer: 0},
    {question: "What is a simile?", options: ["A type of poem", "A comparison using 'like' or 'as'", "A hidden meaning", "A narrative technique"], answer: 1},
    {question: "Choose the sentence with correct subject-verb agreement.", options: ["The team are ready", "The team is ready", "The team were having", "The team am prepared"], answer: 1},
    {question: "What does 'pragmatic' mean?", options: ["Theoretical", "Practical and realistic", "Dishonest", "Complicated"], answer: 1},
    {question: "Which of these is a complex sentence?", options: ["She ran fast.", "She ran fast and jumped high.", "Although she was tired, she ran fast.", "She ran, jumped, and played."], answer: 2},
  ],
  mathematics: [
    {question: "Solve: 2x + 5 = 13. What is x?", options: ["3", "4", "5", "6"], answer: 1},
    {question: "What is the area of a rectangle with length 8cm and width 5cm?", options: ["13 cm²", "26 cm²", "40 cm²", "80 cm²"], answer: 2},
    {question: "If a triangle has sides 3, 4, and 5, what type of triangle is it?", options: ["Acute", "Right-angled", "Obtuse", "Scalene"], answer: 1},
    {question: "What is 15% of 200?", options: ["15", "20", "30", "40"], answer: 2},
    {question: "Simplify: 3x² + 2x - x²", options: ["4x² + 2x", "2x² + 2x", "3x² - x", "x² + 2x"], answer: 1},
    {question: "What is the circumference of a circle with radius 7cm? (Use π = 22/7)", options: ["44 cm", "49 cm", "88 cm", "154 cm"], answer: 0},
    {question: "If 5n = 45, what is n?", options: ["8", "9", "10", "11"], answer: 1},
    {question: "What is the mean of 5, 10, 15, 20?", options: ["10", "12.5", "14", "15"], answer: 1},
    {question: "Solve: x/4 = 6. What is x?", options: ["1.5", "10", "24", "12"], answer: 2},
    {question: "What is 2³ + 3²?", options: ["17", "18", "19", "20"], answer: 0},
    {question: "If y = 2x + 3, what is y when x = 4?", options: ["8", "10", "11", "12"], answer: 2},
    {question: "What is the volume of a cube with side length 3cm?", options: ["9 cm³", "18 cm³", "27 cm³", "36 cm³"], answer: 2},
    {question: "Simplify: (2x³)²", options: ["4x⁵", "4x⁶", "2x⁶", "8x⁶"], answer: 1},
    {question: "What percentage is 25 out of 80?", options: ["25%", "31.25%", "40%", "50%"], answer: 1},
    {question: "If a = 5 and b = 3, what is a² - b²?", options: ["16", "25", "34", "9"], answer: 0},
  ],
  biology: [
    {question: "What is the basic unit of life?", options: ["Atom", "Molecule", "Cell", "Organ"], answer: 2},
    {question: "Which organelle is responsible for energy production in a cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"], answer: 1},
    {question: "What is the process by which plants make their own food?", options: ["Respiration", "Photosynthesis", "Fermentation", "Digestion"], answer: 1},
    {question: "How many chromosomes does a human have?", options: ["23", "46", "92", "48"], answer: 1},
    {question: "What is the main function of the lungs?", options: ["Digestion", "Gas exchange", "Circulation", "Excretion"], answer: 1},
    {question: "Which blood type is known as the universal donor?", options: ["A", "B", "AB", "O"], answer: 3},
    {question: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Chloroplast", "Endoplasmic reticulum"], answer: 1},
    {question: "What does DNA stand for?", options: ["Deoxyribonucleic acid", "Diribose nucleic acid", "Deoxyribose acid", "Dynamic nucleic acid"], answer: 0},
    {question: "Which enzyme breaks down starch?", options: ["Lipase", "Protease", "Amylase", "Maltase"], answer: 2},
    {question: "What is the pH of a neutral solution?", options: ["5", "7", "9", "10"], answer: 1},
    {question: "Which gland produces insulin?", options: ["Thyroid", "Pancreas", "Pituitary", "Adrenal"], answer: 1},
    {question: "What is the function of red blood cells?", options: ["Fight infections", "Transport oxygen", "Clot blood", "Produce energy"], answer: 1},
    {question: "Which type of reproduction involves two parents?", options: ["Asexual", "Sexual", "Binary fission", "Budding"], answer: 1},
    {question: "What is the name of the process where water evaporates from leaves?", options: ["Osmosis", "Transpiration", "Photosynthesis", "Respiration"], answer: 1},
    {question: "Which of these is a prokaryote?", options: ["Plant cell", "Animal cell", "Bacterium", "Fungus"], answer: 2},
  ],
  chemistry: [
    {question: "What is the chemical formula for water?", options: ["H2O", "CO2", "O2", "H2"], answer: 0},
    {question: "How many elements are in the periodic table?", options: ["92", "104", "118", "150"], answer: 2},
    {question: "What is the pH of a strong acid?", options: ["7", "Less than 7", "Greater than 7", "14"], answer: 1},
    {question: "What does ATP stand for?", options: ["Adenosine triphosphate", "Adenine tripeptide", "Amino acid triphosphate", "Atomic triple phosphate"], answer: 0},
    {question: "What is the atomic number of carbon?", options: ["4", "6", "8", "12"], answer: 1},
    {question: "Which metal is most reactive?", options: ["Copper", "Iron", "Sodium", "Aluminum"], answer: 2},
    {question: "What is a covalent bond?", options: ["Transfer of electrons", "Sharing of electrons", "Attraction between ions", "Metallic bonding"], answer: 1},
    {question: "What is the molecular weight of CO2 approximately?", options: ["12", "28", "44", "60"], answer: 2},
    {question: "Which gas is produced when acids react with metals?", options: ["Oxygen", "Carbon dioxide", "Hydrogen", "Nitrogen"], answer: 2},
    {question: "What is oxidation?", options: ["Loss of electrons", "Gain of electrons", "Loss of oxygen", "Gain of oxygen"], answer: 0},
    {question: "What is the state of matter for ice?", options: ["Gas", "Liquid", "Solid", "Plasma"], answer: 2},
    {question: "How many valence electrons does oxygen have?", options: ["2", "4", "6", "8"], answer: 2},
    {question: "What is the process of converting a solid directly to a gas?", options: ["Melting", "Evaporation", "Sublimation", "Condensation"], answer: 2},
    {question: "Which of these is an ionic compound?", options: ["CO2", "NaCl", "H2O", "O2"], answer: 1},
    {question: "What is a catalyst?", options: ["A substance that slows down reactions", "A substance that speeds up reactions", "A substance that stops reactions", "A byproduct of reactions"], answer: 1},
  ],
  physics: [
    {question: "What is the SI unit of force?", options: ["Dyne", "Newton", "Pascal", "Joule"], answer: 1},
    {question: "What is the speed of light?", options: ["3 × 10⁷ m/s", "3 × 10⁸ m/s", "3 × 10⁹ m/s", "3 × 10¹⁰ m/s"], answer: 1},
    {question: "What is Newton's first law of motion?", options: ["F = ma", "An object at rest stays at rest unless acted upon", "Action and reaction are equal", "Energy is conserved"], answer: 1},
    {question: "What is the formula for kinetic energy?", options: ["KE = mgh", "KE = ½mv²", "KE = qv", "KE = Pt"], answer: 1},
    {question: "What is the SI unit of energy?", options: ["Watt", "Volt", "Joule", "Newton"], answer: 2},
    {question: "What does the law of conservation of energy state?", options: ["Energy is created and destroyed", "Energy cannot be created or destroyed", "Energy only increases", "Energy decreases over time"], answer: 1},
    {question: "What is the acceleration due to gravity on Earth?", options: ["5 m/s²", "9.8 m/s²", "12 m/s²", "15 m/s²"], answer: 1},
    {question: "What is the formula for electrical power?", options: ["P = IV", "P = IR", "P = Q/t", "P = mgh"], answer: 0},
    {question: "What is a scalar quantity?", options: ["Has direction only", "Has magnitude only", "Has both magnitude and direction", "Has neither"], answer: 1},
    {question: "What is the SI unit of pressure?", options: ["Bar", "Atmosphere", "Pascal", "Torr"], answer: 2},
    {question: "What is the focal length of a plane mirror?", options: ["0", "Infinity", "Positive", "Negative"], answer: 1},
    {question: "What type of image is formed by a plane mirror?", options: ["Real and inverted", "Virtual and upright", "Real and upright", "Virtual and inverted"], answer: 1},
    {question: "What is the relationship between frequency and wavelength?", options: ["f × λ = v", "f + λ = v", "f / λ = v", "f × λ = c²"], answer: 0},
    {question: "What is the SI unit of temperature?", options: ["Celsius", "Fahrenheit", "Kelvin", "Rankine"], answer: 2},
    {question: "What is Ohm's law?", options: ["V = IR", "V = I/R", "V = I²R", "R = V/I²"], answer: 0},
  ],
  economics: [
    {question: "What is economics?", options: ["Study of wealth", "Study of scarcity and choice", "Study of money", "Study of trade"], answer: 1},
    {question: "What are the factors of production?", options: ["Land and water", "Land, labour, capital, and enterprise", "Only capital", "Money and goods"], answer: 1},
    {question: "What is inflation?", options: ["Decrease in prices", "Increase in prices", "Stability of prices", "No change in economy"], answer: 1},
    {question: "What is demand?", options: ["What producers supply", "What consumers wish to buy at a price", "Total quantity available", "Goods in the market"], answer: 1},
    {question: "What is supply?", options: ["What consumers want", "Quantity producers are willing to sell", "Total market size", "Available resources"], answer: 1},
    {question: "What does GDP stand for?", options: ["Gross Domestic Policy", "Gross Domestic Product", "General Development Program", "Growth Domestic Portfolio"], answer: 1},
    {question: "What is a monopoly?", options: ["Two sellers", "One seller", "Many sellers", "No sellers"], answer: 1},
    {question: "What is unemployment?", options: ["Having two jobs", "Not having a job when willing", "Retirement", "Part-time work"], answer: 1},
    {question: "What is a budget deficit?", options: ["Extra income", "More expenses than revenue", "Balanced account", "Surplus"], answer: 1},
    {question: "What is interest?", options: ["Principal amount", "Cost of borrowing money", "Profit from sales", "Tax payment"], answer: 1},
    {question: "What is the main function of a bank?", options: ["Produce goods", "Provide financial services", "Make laws", "Build infrastructure"], answer: 1},
    {question: "What does exchange rate mean?", options: ["Price of a stock", "Rate of currency conversion", "Inflation rate", "Interest rate"], answer: 1},
    {question: "What is a tariff?", options: ["Tax on domestic goods", "Tax on imported goods", "Tax on services", "Tax on income"], answer: 1},
    {question: "What is a consumer?", options: ["Producer of goods", "Buyer of goods and services", "Seller of goods", "Exporter"], answer: 1},
    {question: "What is profit?", options: ["Total revenue", "Revenue minus costs", "Money spent", "Assets minus liabilities"], answer: 1},
  ],
  government: [
    {question: "What is government?", options: ["A business", "System of organizing state affairs", "Military force", "Educational institution"], answer: 1},
    {question: "How many arms of government are there?", options: ["One", "Two", "Three", "Four"], answer: 2},
    {question: "What does the executive do?", options: ["Make laws", "Enforce laws", "Interpret laws", "Collect taxes"], answer: 1},
    {question: "What is the legislature?", options: ["Law enforcement body", "Law-making body", "Judicial body", "Military body"], answer: 1},
    {question: "What is the main role of the judiciary?", options: ["Make laws", "Execute laws", "Interpret laws and dispense justice", "Collect revenue"], answer: 2},
    {question: "What is a constitution?", options: ["Government budget", "Fundamental law of a state", "Military document", "Trade agreement"], answer: 1},
    {question: "What is democracy?", options: ["Rule by one", "Rule by the few", "Rule by the many", "Rule by the military"], answer: 2},
    {question: "What is a citizen?", options: ["A visitor", "A resident of another country", "Legal member of a state", "A government official"], answer: 2},
    {question: "What is a right?", options: ["A duty", "Legal entitlement", "A punishment", "A privilege"], answer: 1},
    {question: "What is sovereignty?", options: ["Power of citizens", "Power of politicians", "Supreme power of a state", "Wealth of a nation"], answer: 2},
    {question: "What is a bill?", options: ["Invoice", "Proposed law", "Government announcement", "Public notice"], answer: 1},
    {question: "What does parliament do?", options: ["Enforce laws", "Make laws", "Interpret laws", "Execute laws"], answer: 1},
    {question: "What is the term of office for a president usually?", options: ["1 year", "3 years", "4-5 years", "10 years"], answer: 2},
    {question: "What is impeachment?", options: ["Election process", "Removal from office", "Legal punishment", "Voting process"], answer: 1},
    {question: "What is federalism?", options: ["One central government", "Division of power between central and regional governments", "Military rule", "Absolute monarchy"], answer: 1},
  ],
};

async function loadSubjectQuestions(key) {
  try {
    // Try to fetch from online first (if hosted)
    try {
      const res = await fetch(`${key}.json`);
      if (res.ok) {
        const raw = await res.json();
        let arr = Array.isArray(raw) ? raw : Object.values(raw).flat();
        return arr.map(q => normaliseQuestion(q, key));
      }
    } catch(e) {
      // Fall through to embedded questions
    }
    
    // Use embedded questions database (works offline in MIT App Inventor)
    const questions = QUESTIONS_DB[key] || [];
    return questions.map(q => normaliseQuestion(q, key));
  } catch (e) {
    console.error(`Could not load ${key}:`, e);
    return [];
  }
}

function normaliseQuestion(q, subjectKey) {
  let text = q.text || q.question || '';
  let options, correctIndex;

  if (Array.isArray(q.options)) {
    // options is array, answer is index (0-3)
    options = q.options.map(String);
    correctIndex = typeof q.answer === 'number' ? q.answer : parseInt(q.answer);
  } else {
    // options is object {a, b, c, d}, answer is letter
    const keys = ['a', 'b', 'c', 'd'];
    options = keys.map(k => String(q.options[k] || ''));
    const ansLetter = String(q.answer).toLowerCase().trim();
    correctIndex = keys.indexOf(ansLetter);
    if (correctIndex < 0) correctIndex = 0;
  }

  return { text, options, correctIndex, subject: subjectKey };
}

// ═══════════════════════════════════════════════════════
// FISHER-YATES SHUFFLE
// ═══════════════════════════════════════════════════════

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

/**
 * Shuffle the options of a question while keeping correctIndex accurate.
 * Returns a new question object with shuffled options and updated correctIndex.
 */
function shuffleOptions(q) {
  const indices = [0, 1, 2, 3].slice(0, q.options.length);
  const shuffledIndices = shuffle(indices);
  const newOptions = shuffledIndices.map(i => q.options[i]);
  const newCorrectIndex = shuffledIndices.indexOf(q.correctIndex);
  return { ...q, options: newOptions, correctIndex: newCorrectIndex };
}

// ═══════════════════════════════════════════════════════
// START PRACTICE
// ═══════════════════════════════════════════════════════

async function startPractice() {
  showLoading(true);
  state.mode = 'practice';

  try {
    let questions = [];

    if (practiceConfig.type === 'single') {
      const all = await loadSubjectQuestions(practiceConfig.singleSubject);
      const picked = pickRandom(all, 50);
      questions = picked.map(shuffleOptions);
      state.examSubjects = [practiceConfig.singleSubject];
    } else {
      for (const key of practiceConfig.multipleSubjects) {
        const all = await loadSubjectQuestions(key);
        const picked = pickRandom(all, 25);
        questions.push(...picked.map(shuffleOptions));
      }
      questions = shuffle(questions); // mix all
      state.examSubjects = [...practiceConfig.multipleSubjects];
    }

    state.questions = questions;
    state.timerMinutes = practiceConfig.timerMins;
    initQuiz();
  } catch (e) {
    alert('Error loading questions. Please try again.');
    console.error(e);
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
// START EXAM
// ═══════════════════════════════════════════════════════

async function startExam() {
  showLoading(true);
  state.mode = 'exam';

  try {
    const allSubjects = ['english', ...examConfig.subjects];
    const counts = { english: 60 };
    examConfig.subjects.forEach(s => counts[s] = 40);

    let questions = [];
    for (const key of allSubjects) {
      const all = await loadSubjectQuestions(key);
      const n = counts[key] || 40;
      const picked = pickRandom(all, n);
      questions.push(...picked.map(shuffleOptions));
    }

    state.questions = questions;
    state.timerMinutes = 120;
    state.examSubjects = allSubjects;
    initQuiz();
  } catch (e) {
    alert('Error loading exam questions. Please try again.');
    console.error(e);
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
// QUIZ INITIALISATION
// ═══════════════════════════════════════════════════════

function initQuiz() {
  state.answers = {};
  state.flagged = new Set();
  state.currentIndex = 0;
  state.warned10 = false;
  state.warned5 = false;
  state.warned1 = false;
  state.secondsLeft = state.timerMinutes * 60;
  state.startTime = Date.now();

  buildPalette();
  renderQuestion(0);
  startTimer();
  showScreen('screen-quiz');
  saveSession();
  // Add sidebar overlay for mobile
  if (!document.getElementById('sidebarOverlay')) {
    const ov = document.createElement('div');
    ov.id = 'sidebarOverlay';
    ov.className = 'sidebar-overlay';
    ov.onclick = closeSidebar;
    document.body.appendChild(ov);
  }
}

// ═══════════════════════════════════════════════════════
// SIDEBAR TOGGLE (MOBILE)
// ═══════════════════════════════════════════════════════

function toggleSidebar() {
  const sidebar = document.getElementById('quizSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay && overlay.classList.toggle('show', sidebar.classList.contains('open'));
}

function closeSidebar() {
  const sidebar = document.getElementById('quizSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay && overlay.classList.remove('show');
}

// ═══════════════════════════════════════════════════════
// QUESTION RENDERING
// ═══════════════════════════════════════════════════════

function renderQuestion(index) {
  const q = state.questions[index];
  if (!q) return;

  state.currentIndex = index;

  // Subject tag
  const subjLabel = SUBJECTS.find(s => s.key === q.subject)?.label || q.subject;
  document.getElementById('quizSubjectTag').textContent = subjLabel;
  document.getElementById('qNumber').textContent = `Q ${index + 1}`;
  document.getElementById('qSubject').textContent = subjLabel;
  document.getElementById('qText').textContent = q.text;

  // Options
  const optList = document.getElementById('optionsList');
  optList.innerHTML = q.options.map((opt, i) => {
    const isSelected = state.answers[index] === i;
    return `
      <button class="option-btn${isSelected ? ' selected' : ''}" onclick="selectOption(${i})">
        <span class="option-letter">${LETTERS[i]}</span>
        <span class="option-text">${opt}</span>
      </button>
    `;
  }).join('');

  // Flag button
  const flagBtn = document.getElementById('flagBtn');
  if (state.flagged.has(index)) {
    flagBtn.classList.add('flagged');
    flagBtn.textContent = '⚑ Flagged';
  } else {
    flagBtn.classList.remove('flagged');
    flagBtn.textContent = '⚑ Flag';
  }

  updatePalette();
  updateProgress();
  saveSession();

  // Scroll question into view on mobile
  document.querySelector('.question-wrap').scrollTop = 0;
}

function selectOption(optIndex) {
  const prev = state.answers[state.currentIndex];
  if (prev === optIndex) {
    // deselect
    delete state.answers[state.currentIndex];
  } else {
    state.answers[state.currentIndex] = optIndex;
  }
  renderQuestion(state.currentIndex);
}

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════

function prevQuestion() {
  if (state.currentIndex > 0) renderQuestion(state.currentIndex - 1);
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    renderQuestion(state.currentIndex + 1);
  }
}

function skipQuestion() {
  nextQuestion();
}

function flagQuestion() {
  const idx = state.currentIndex;
  if (state.flagged.has(idx)) {
    state.flagged.delete(idx);
  } else {
    state.flagged.add(idx);
  }
  renderQuestion(idx);
}

// ═══════════════════════════════════════════════════════
// PALETTE
// ═══════════════════════════════════════════════════════

function buildPalette() {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = state.questions.map((_, i) =>
    `<button class="pal-btn" id="pal-${i}" onclick="jumpTo(${i})">${i + 1}</button>`
  ).join('');
}

function updatePalette() {
  state.questions.forEach((_, i) => {
    const btn = document.getElementById(`pal-${i}`);
    if (!btn) return;
    btn.className = 'pal-btn';
    if (i === state.currentIndex) btn.classList.add('current');
    else if (state.flagged.has(i)) btn.classList.add('flagged');
    else if (state.answers[i] !== undefined) btn.classList.add('answered');
  });
}

function jumpTo(index) {
  renderQuestion(index);
  closeSidebar();
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  const total = state.questions.length;
  const pct = total ? (answered / total) * 100 : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${answered} / ${total} answered`;
}

// ═══════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.secondsLeft--;
    updateTimerDisplay();
    checkWarnings();
    if (state.secondsLeft <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      autoSubmit();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timerCountdown');
  if (!el) return;
  const mins = Math.floor(state.secondsLeft / 60);
  const secs = state.secondsLeft % 60;
  el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  el.className = 'timer-display';
  if (state.secondsLeft <= 60) el.classList.add('danger');
  else if (state.secondsLeft <= 300) el.classList.add('warning');
}

function checkWarnings() {
  const m = Math.floor(state.secondsLeft / 60);
  const s = state.secondsLeft % 60;
  if (m === 10 && s === 0 && !state.warned10) {
    state.warned10 = true;
    showWarningModal('⏰', '10 Minutes Left', 'You have 10 minutes remaining. Start wrapping up!', false);
  } else if (m === 5 && s === 0 && !state.warned5) {
    state.warned5 = true;
    showWarningModal('⚠️', '5 Minutes Left', 'Only 5 minutes left! Review and submit soon.', false);
  } else if (m === 1 && s === 0 && !state.warned1) {
    state.warned1 = true;
    showWarningModal('🚨', '1 Minute Left!', 'Final minute! Submit now.', false);
  }
}

function autoSubmit() {
  state.endTime = Date.now();
  showWarningModal('⏱', 'Time Up!', 'Your time has expired. Submitting your answers now.', false, submitExam);
}

// ═══════════════════════════════════════════════════════
// SUBMISSION
// ═══════════════════════════════════════════════════════

function confirmSubmit() {
  const answered = Object.keys(state.answers).length;
  const total = state.questions.length;
  const unanswered = total - answered;
  showModal(
    '📋',
    'Submit Exam?',
    `You have answered ${answered} of ${total} questions. ${unanswered > 0 ? `${unanswered} question(s) unanswered.` : 'All questions answered!'} Submit now?`,
    submitExam
  );
}

function submitExam() {
  closeModal();
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.endTime = state.endTime || Date.now();
  calculateResults();
  clearSession();
}

function calculateResults() {
  let correct = 0, wrong = 0, skipped = 0;
  const subjectStats = {};

  state.questions.forEach((q, i) => {
    const subj = q.subject;
    if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 };
    subjectStats[subj].total++;

    const userAnswer = state.answers[i];
    if (userAnswer === undefined) {
      skipped++;
    } else if (userAnswer === q.correctIndex) {
      correct++;
      subjectStats[subj].correct++;
    } else {
      wrong++;
    }
  });

  const total = state.questions.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const grade = pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
  const gradeLabel = { A: 'Excellent! 🏆', B: 'Very Good! 👏', C: 'Good! 🎉', D: 'Average. Keep Going!', F: 'Below Average. Try Again!' }[grade];

  const timeUsed = state.endTime - state.startTime;
  const minsUsed = Math.floor(timeUsed / 60000);
  const secsUsed = Math.floor((timeUsed % 60000) / 1000);

  // Render results
  const gradeCard = document.getElementById('gradeCard');
  const gradeRing = document.getElementById('gradeRing');
  gradeRing.className = `grade-ring ${grade}`;
  document.getElementById('gradeLetter').textContent = grade;
  document.getElementById('gradeScore').textContent = `${pct}%`;
  document.getElementById('gradeLabel').textContent = gradeLabel;

  document.getElementById('rsCorrect').textContent = correct;
  document.getElementById('rsWrong').textContent = wrong;
  document.getElementById('rsSkipped').textContent = skipped;
  document.getElementById('rsTime').textContent = `${minsUsed}:${String(secsUsed).padStart(2, '0')}`;

  // Subject breakdown
  const subjEl = document.getElementById('resultsSubjects');
  subjEl.innerHTML = `<h4>Subject Breakdown</h4>` + Object.entries(subjectStats).map(([key, stats]) => {
    const sp = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    const cls = sp >= 60 ? 'good' : sp >= 40 ? 'ok' : 'bad';
    const label = SUBJECTS.find(s => s.key === key)?.label || key;
    return `<div class="sub-result">
      <span class="sub-result-name">${label}</span>
      <span class="sub-result-score ${cls}">${stats.correct}/${stats.total} (${sp}%)</span>
    </div>`;
  }).join('');

  showScreen('screen-results');
}

// ═══════════════════════════════════════════════════════
// REVIEW
// ═══════════════════════════════════════════════════════

function reviewAnswers() {
  const list = document.getElementById('reviewList');
  list.innerHTML = state.questions.map((q, i) => {
    const userAns = state.answers[i];
    const isCorrect = userAns === q.correctIndex;
    const isSkipped = userAns === undefined;
    const status = isSkipped ? 'skipped' : isCorrect ? 'correct' : 'wrong';
    const statusLabel = isSkipped ? '— Skipped' : isCorrect ? '✓ Correct' : '✗ Wrong';
    const subjLabel = SUBJECTS.find(s => s.key === q.subject)?.label || q.subject;

    const opts = q.options.map((opt, j) => {
      let cls = '';
      if (j === q.correctIndex) cls = 'correct-ans';
      else if (j === userAns && !isCorrect) cls = 'user-wrong';
      return `<div class="review-opt ${cls}">
        <span class="opt-lbl">${LETTERS[j]}</span>
        <span>${opt}</span>
        ${j === q.correctIndex ? '<span style="margin-left:auto;font-size:11px;font-weight:700">✓ Correct</span>' : ''}
        ${j === userAns && !isCorrect ? '<span style="margin-left:auto;font-size:11px;font-weight:700">✗ Your answer</span>' : ''}
      </div>`;
    }).join('');

    return `<div class="review-item">
      <div class="review-meta">
        <span class="review-num">Q${i + 1}</span>
        <span class="review-subj">${subjLabel}</span>
        <span class="review-status ${status}">${statusLabel}</span>
      </div>
      <div class="review-q">${q.text}</div>
      <div class="review-options">${opts}</div>
    </div>`;
  }).join('');

  showScreen('screen-review');
}

// ═══════════════════════════════════════════════════════
// RETRY
// ═══════════════════════════════════════════════════════

async function retryQuiz() {
  showLoading(true);
  try {
    if (state.mode === 'exam') {
      await startExam();
    } else if (state.mode === 'practice') {
      await startPractice();
    }
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════

function showModal(icon, title, msg, onConfirm) {
  document.getElementById('modalIcon').textContent = icon;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent = msg;
  const confirmBtn = document.getElementById('modalConfirm');
  confirmBtn.onclick = onConfirm || closeModal;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function showWarningModal(icon, title, msg, closeable = true, onConfirm = null) {
  document.getElementById('modalIcon').textContent = icon;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent = msg;
  const confirmBtn = document.getElementById('modalConfirm');
  confirmBtn.textContent = 'OK, Got it';
  confirmBtn.onclick = () => {
    closeModal();
    if (onConfirm) onConfirm();
  };
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalConfirm').textContent = 'Confirm';
  document.getElementById('modalConfirm').onclick = null;
}

// ═══════════════════════════════════════════════════════
// FULLSCREEN
// ═══════════════════════════════════════════════════════

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════
// SESSION PERSISTENCE
// ═══════════════════════════════════════════════════════

function saveSession() {
  try {
    const session = {
      mode: state.mode,
      practiceType: state.practiceType,
      questions: state.questions,
      answers: state.answers,
      flagged: [...state.flagged],
      currentIndex: state.currentIndex,
      secondsLeft: state.secondsLeft,
      startTime: state.startTime,
      timerMinutes: state.timerMinutes,
      examSubjects: state.examSubjects,
      practiceConfig: { ...practiceConfig },
      examConfig: { ...examConfig },
    };
    localStorage.setItem('preplite-session', JSON.stringify(session));
  } catch (e) {}
}

function tryRestoreSession() {
  try {
    const raw = localStorage.getItem('preplite-session');
    if (!raw) return;
    const session = JSON.parse(raw);
    if (!session || !session.questions || !session.questions.length) return;

    // Restore
    state.mode = session.mode;
    state.practiceType = session.practiceType;
    state.questions = session.questions;
    state.answers = session.answers || {};
    state.flagged = new Set(session.flagged || []);
    state.currentIndex = session.currentIndex || 0;
    state.secondsLeft = session.secondsLeft || 0;
    state.startTime = session.startTime;
    state.timerMinutes = session.timerMinutes;
    state.examSubjects = session.examSubjects || [];
    if (session.practiceConfig) practiceConfig = session.practiceConfig;
    if (session.examConfig) examConfig = session.examConfig;

    if (state.secondsLeft > 0) {
      showModal('🔄', 'Restore Session?', 'You have an unfinished exam. Would you like to continue?', () => {
        closeModal();
        buildPalette();
        renderQuestion(state.currentIndex);
        startTimer();
        showScreen('screen-quiz');
      });
    } else {
      clearSession();
    }
  } catch (e) {
    clearSession();
  }
}

function clearSession() {
  localStorage.removeItem('preplite-session');
}

function resetState() {
  state.mode = null;
  state.practiceType = null;
  state.questions = [];
  state.answers = {};
  state.flagged = new Set();
  state.currentIndex = 0;
  state.timerInterval = null;
  state.secondsLeft = 0;
  state.startTime = null;
  state.endTime = null;
  state.examSubjects = [];
  state.warned10 = false;
  state.warned5 = false;
  state.warned1 = false;
}

// ═══════════════════════════════════════════════════════
// LOADING
// ═══════════════════════════════════════════════════════

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}

// ═══════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  const active = document.querySelector('.screen.active');
  if (!active || active.id !== 'screen-quiz') return;

  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': nextQuestion(); break;
    case 'ArrowLeft':  case 'ArrowUp':   prevQuestion(); break;
    case '1': case 'a': case 'A': selectOption(0); break;
    case '2': case 'b': case 'B': selectOption(1); break;
    case '3': case 'c': case 'C': selectOption(2); break;
    case '4': case 'd': case 'D': selectOption(3); break;
    case 'f': case 'F': flagQuestion(); break;
    case 'F11': e.preventDefault(); toggleFullscreen(); break;
  }
});
