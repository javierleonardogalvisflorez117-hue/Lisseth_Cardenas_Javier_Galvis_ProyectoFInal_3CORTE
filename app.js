/* =====================================================================
   RaízCalc — Application Logic
   Root-Finding Methods Educational App
   ===================================================================== */

// ======================== STATE ========================
const state = {
  currentMethod: 'biseccion',
  chart: null,
  history: JSON.parse(localStorage.getItem('raiz-calc-history') || '[]'),
  theme: localStorage.getItem('raiz-calc-theme') || 'dark',
};

// ======================== DOM REFERENCES ========================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  form: $('#calc-form'),
  methodCards: $$('.method-card'),
  inputFx: $('#input-fx'),
  inputGx: $('#input-gx'),
  inputA: $('#input-a'),
  inputB: $('#input-b'),
  inputX0: $('#input-x0'),
  inputTol: $('#input-tol'),
  inputMaxIter: $('#input-maxiter'),
  groupFx: $('#group-fx'),
  groupGx: $('#group-gx'),
  groupAB: $('#group-ab'),
  groupX0: $('#group-x0'),
  btnCalculate: $('#btn-calculate'),
  btnClear: $('#btn-clear'),
  btnTheory: $('#btn-theory'),
  btnTheme: $('#btn-theme'),
  btnExamples: $('#btn-examples'),
  btnHistory: $('#btn-history'),
  validationMsg: $('#validation-msg'),
  resultsEmpty: $('#results-empty'),
  tabSummary: $('#tab-summary'),
  tabTable: $('#tab-table'),
  tabChart: $('#tab-chart'),
  resultRoot: $('#result-root'),
  resultError: $('#result-error'),
  resultIters: $('#result-iters'),
  resultFval: $('#result-fval'),
  convergenceMsg: $('#convergence-msg'),
  tableHead: $('#table-head'),
  tableBody: $('#table-body'),
  resultsTabs: $('#results-tabs'),
  theoryModal: $('#theory-modal'),
  theoryTitle: $('#theory-title'),
  theoryBody: $('#theory-body'),
  theoryClose: $('#theory-close'),
  examplesModal: $('#examples-modal'),
  examplesBody: $('#examples-body'),
  examplesClose: $('#examples-close'),
  historyOverlay: $('#history-overlay'),
  historyList: $('#history-list'),
  btnCloseHistory: $('#btn-close-history'),
  btnClearHistory: $('#btn-clear-history'),
  toastContainer: $('#toast-container'),
  chartContainer: $('#chart-container'),
};

// ======================== INITIALIZATION ========================
function init() {
  applyTheme(state.theme);
  setupEventListeners();
  updateFormForMethod(state.currentMethod);
  renderExamples();
  renderHistory();
}

// ======================== EVENT LISTENERS ========================
function setupEventListeners() {
  // Method selection
  dom.methodCards.forEach(card => {
    card.addEventListener('click', () => {
      dom.methodCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.currentMethod = card.dataset.method;
      updateFormForMethod(state.currentMethod);
      hideValidation();
    });
  });

  // Form submit
  dom.form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  // Clear
  dom.btnClear.addEventListener('click', clearAll);

  // Theme
  dom.btnTheme.addEventListener('click', toggleTheme);

  // Theory
  dom.btnTheory.addEventListener('click', () => showTheory(state.currentMethod));

  // Examples
  dom.btnExamples.addEventListener('click', () => dom.examplesModal.classList.remove('hidden'));
  dom.examplesClose.addEventListener('click', () => dom.examplesModal.classList.add('hidden'));
  dom.examplesModal.addEventListener('click', (e) => {
    if (e.target === dom.examplesModal) dom.examplesModal.classList.add('hidden');
  });

  // Theory modal close
  dom.theoryClose.addEventListener('click', () => dom.theoryModal.classList.add('hidden'));
  dom.theoryModal.addEventListener('click', (e) => {
    if (e.target === dom.theoryModal) dom.theoryModal.classList.add('hidden');
  });

  // History
  dom.btnHistory.addEventListener('click', () => dom.historyOverlay.classList.remove('hidden'));
  dom.btnCloseHistory.addEventListener('click', () => dom.historyOverlay.classList.add('hidden'));
  dom.historyOverlay.addEventListener('click', (e) => {
    if (e.target === dom.historyOverlay) dom.historyOverlay.classList.add('hidden');
  });
  dom.btnClearHistory.addEventListener('click', () => {
    state.history = [];
    localStorage.setItem('raiz-calc-history', '[]');
    renderHistory();
    showToast('Historial limpiado', 'success');
  });

  // Tabs
  dom.resultsTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    dom.tabSummary.classList.add('hidden');
    dom.tabTable.classList.add('hidden');
    dom.tabChart.classList.add('hidden');
    $(`#tab-${tab}`).classList.remove('hidden');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dom.theoryModal.classList.add('hidden');
      dom.examplesModal.classList.add('hidden');
      dom.historyOverlay.classList.add('hidden');
    }
  });
}

// ======================== FORM MANAGEMENT ========================
function updateFormForMethod(method) {
  // Show/hide fields based on method
  dom.groupFx.classList.remove('hidden');
  dom.groupGx.classList.add('hidden');
  dom.groupAB.classList.remove('hidden');
  dom.groupX0.classList.add('hidden');

  switch (method) {
    case 'biseccion':
    case 'falsa-posicion':
      // f(x), a, b — default visibility
      break;
    case 'punto-fijo':
      dom.groupGx.classList.remove('hidden');
      dom.groupAB.classList.add('hidden');
      dom.groupX0.classList.remove('hidden');
      break;
    case 'newton':
      dom.groupAB.classList.add('hidden');
      dom.groupX0.classList.remove('hidden');
      break;
  }
}

// ======================== VALIDATION ========================
function validate() {
  const method = state.currentMethod;
  const fx = dom.inputFx.value.trim();
  const tol = parseFloat(dom.inputTol.value);
  const maxIter = parseInt(dom.inputMaxIter.value);

  if (!fx) {
    showValidation('Por favor ingresa una función f(x).', 'error');
    return false;
  }

  // Test if function is valid
  try {
    const compiled = math.compile(fx);
    compiled.evaluate({ x: 1 });
  } catch (e) {
    showValidation(`La función f(x) no es válida: ${e.message}`, 'error');
    return false;
  }

  if (isNaN(tol) || tol <= 0) {
    showValidation('La tolerancia debe ser un número positivo.', 'error');
    return false;
  }

  if (isNaN(maxIter) || maxIter < 1) {
    showValidation('El número máximo de iteraciones debe ser al menos 1.', 'error');
    return false;
  }

  if (method === 'biseccion' || method === 'falsa-posicion') {
    const a = parseFloat(dom.inputA.value);
    const b = parseFloat(dom.inputB.value);
    if (isNaN(a) || isNaN(b)) {
      showValidation('Ingresa valores numéricos para a y b.', 'error');
      return false;
    }
    if (a >= b) {
      showValidation('El valor de a debe ser menor que b.', 'error');
      return false;
    }
    // Check Bolzano condition
    const fa = evalFunc(fx, a);
    const fb = evalFunc(fx, b);
    if (fa * fb > 0) {
      showValidation(`⚠️ f(a) × f(b) > 0 — No se garantiza una raíz en [${a}, ${b}]. f(${a}) = ${fa.toFixed(6)}, f(${b}) = ${fb.toFixed(6)}. Verifica el intervalo.`, 'warning');
      return false;
    }
  }

  if (method === 'punto-fijo') {
    const gx = dom.inputGx.value.trim();
    const x0 = parseFloat(dom.inputX0.value);
    if (!gx) {
      showValidation('Ingresa la función de iteración g(x).', 'error');
      return false;
    }
    try {
      const compiled = math.compile(gx);
      compiled.evaluate({ x: 1 });
    } catch (e) {
      showValidation(`La función g(x) no es válida: ${e.message}`, 'error');
      return false;
    }
    if (isNaN(x0)) {
      showValidation('Ingresa un valor numérico para x₀.', 'error');
      return false;
    }
  }

  if (method === 'newton') {
    const x0 = parseFloat(dom.inputX0.value);
    if (isNaN(x0)) {
      showValidation('Ingresa un valor numérico para x₀.', 'error');
      return false;
    }
  }

  hideValidation();
  return true;
}

function showValidation(msg, type) {
  dom.validationMsg.textContent = msg;
  dom.validationMsg.className = `validation-msg ${type}`;
  dom.validationMsg.classList.remove('hidden');
}

function hideValidation() {
  dom.validationMsg.classList.add('hidden');
}

// ======================== MATH HELPERS ========================
function evalFunc(expr, x) {
  try {
    const compiled = math.compile(expr);
    return compiled.evaluate({ x });
  } catch {
    return NaN;
  }
}

function numericalDerivative(expr, x, h = 1e-8) {
  return (evalFunc(expr, x + h) - evalFunc(expr, x - h)) / (2 * h);
}

function formatNum(n, decimals = 10) {
  if (typeof n !== 'number' || isNaN(n)) return 'NaN';
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (Math.abs(n) < 1e-15) return '0';
  if (Math.abs(n) > 1e10 || (Math.abs(n) < 1e-6 && n !== 0)) {
    return n.toExponential(6);
  }
  return parseFloat(n.toFixed(decimals)).toString();
}

// ======================== ROOT-FINDING METHODS ========================

function biseccion(fx, a, b, tol, maxIter) {
  const iterations = [];
  let fa = evalFunc(fx, a);
  let fb = evalFunc(fx, b);
  let c, fc, error;
  let converged = false;

  for (let i = 1; i <= maxIter; i++) {
    c = (a + b) / 2;
    fc = evalFunc(fx, c);
    error = Math.abs(b - a) / 2;

    iterations.push({
      n: i, a, b, c, fa, fb, fc, error
    });

    if (Math.abs(fc) < 1e-15 || error < tol) {
      converged = true;
      break;
    }

    if (fa * fc < 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }
  }

  return {
    root: c,
    fRoot: fc,
    error,
    iterations,
    converged,
    method: 'Bisección'
  };
}

function puntoFijo(fx, gx, x0, tol, maxIter) {
  const iterations = [];
  let xn = x0;
  let converged = false;
  let error = Infinity;

  for (let i = 1; i <= maxIter; i++) {
    const gxn = evalFunc(gx, xn);
    error = Math.abs(gxn - xn);
    const fxn = evalFunc(fx, xn);

    iterations.push({
      n: i, xn, gxn, fxn, error
    });

    if (error < tol) {
      converged = true;
      xn = gxn;
      break;
    }

    if (!isFinite(gxn) || isNaN(gxn)) {
      break;
    }

    xn = gxn;
  }

  return {
    root: xn,
    fRoot: evalFunc(fx, xn),
    error,
    iterations,
    converged,
    method: 'Punto Fijo'
  };
}

function newtonRaphson(fx, x0, tol, maxIter) {
  const iterations = [];
  let xn = x0;
  let converged = false;
  let error = Infinity;

  for (let i = 1; i <= maxIter; i++) {
    const fxn = evalFunc(fx, xn);
    const fpxn = numericalDerivative(fx, xn);

    if (Math.abs(fpxn) < 1e-15) {
      iterations.push({
        n: i, xn, fxn, fpxn, xn1: NaN, error: NaN
      });
      break;
    }

    const xn1 = xn - fxn / fpxn;
    error = Math.abs(xn1 - xn);

    iterations.push({
      n: i, xn, fxn, fpxn, xn1, error
    });

    if (error < tol) {
      converged = true;
      xn = xn1;
      break;
    }

    if (!isFinite(xn1) || isNaN(xn1)) {
      break;
    }

    xn = xn1;
  }

  return {
    root: xn,
    fRoot: evalFunc(fx, xn),
    error,
    iterations,
    converged,
    method: 'Newton-Raphson'
  };
}

function falsaPosicion(fx, a, b, tol, maxIter) {
  const iterations = [];
  let fa = evalFunc(fx, a);
  let fb = evalFunc(fx, b);
  let c, fc, error;
  let converged = false;
  let prevC = null;

  for (let i = 1; i <= maxIter; i++) {
    c = (a * fb - b * fa) / (fb - fa);
    fc = evalFunc(fx, c);
    error = prevC !== null ? Math.abs(c - prevC) : Math.abs(b - a);

    iterations.push({
      n: i, a, b, c, fa, fb, fc, error
    });

    if (Math.abs(fc) < 1e-15 || error < tol) {
      converged = true;
      break;
    }

    if (fa * fc < 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }

    prevC = c;
  }

  return {
    root: c,
    fRoot: fc,
    error,
    iterations,
    converged,
    method: 'Falsa Posición'
  };
}

// ======================== CALCULATE ========================
function calculate() {
  if (!validate()) return;

  const fx = dom.inputFx.value.trim();
  const tol = parseFloat(dom.inputTol.value);
  const maxIter = parseInt(dom.inputMaxIter.value);
  const method = state.currentMethod;

  let result;

  try {
    switch (method) {
      case 'biseccion': {
        const a = parseFloat(dom.inputA.value);
        const b = parseFloat(dom.inputB.value);
        result = biseccion(fx, a, b, tol, maxIter);
        break;
      }
      case 'punto-fijo': {
        const gx = dom.inputGx.value.trim();
        const x0 = parseFloat(dom.inputX0.value);
        result = puntoFijo(fx, gx, x0, tol, maxIter);
        break;
      }
      case 'newton': {
        const x0 = parseFloat(dom.inputX0.value);
        result = newtonRaphson(fx, x0, tol, maxIter);
        break;
      }
      case 'falsa-posicion': {
        const a = parseFloat(dom.inputA.value);
        const b = parseFloat(dom.inputB.value);
        result = falsaPosicion(fx, a, b, tol, maxIter);
        break;
      }
    }
  } catch (e) {
    showValidation(`Error al calcular: ${e.message}`, 'error');
    return;
  }

  displayResults(result, fx);
  saveToHistory(result, fx);

  showToast(result.converged ? '✅ Raíz encontrada' : '⚠️ No convergió', result.converged ? 'success' : 'error');
}

// ======================== DISPLAY RESULTS ========================
function displayResults(result, fx) {
  // Hide empty, show summary tab
  dom.resultsEmpty.classList.add('hidden');
  dom.tabSummary.classList.remove('hidden');
  dom.tabTable.classList.add('hidden');
  dom.tabChart.classList.add('hidden');

  // Activate summary tab
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $$('.tab-btn')[0].classList.add('active');

  // Summary cards
  dom.resultRoot.textContent = formatNum(result.root, 10);
  dom.resultError.textContent = formatNum(result.error);
  dom.resultIters.textContent = result.iterations.length;
  dom.resultFval.textContent = formatNum(result.fRoot);

  // Convergence message
  if (result.converged) {
    dom.convergenceMsg.className = 'convergence-msg success';
    dom.convergenceMsg.innerHTML = `
      <strong>✅ El método convergió exitosamente.</strong><br>
      La raíz aproximada es <strong>${formatNum(result.root, 10)}</strong> con un error de <strong>${formatNum(result.error)}</strong> en <strong>${result.iterations.length}</strong> iteraciones.
    `;
  } else {
    const lastIter = result.iterations[result.iterations.length - 1];
    if (lastIter && (isNaN(lastIter.error) || !isFinite(lastIter.error))) {
      dom.convergenceMsg.className = 'convergence-msg error';
      dom.convergenceMsg.innerHTML = `
        <strong>❌ El método divergió.</strong><br>
        El cálculo produjo valores indefinidos. Verifica la función y los parámetros iniciales.
      `;
    } else {
      dom.convergenceMsg.className = 'convergence-msg warning';
      dom.convergenceMsg.innerHTML = `
        <strong>⚠️ No se alcanzó convergencia.</strong><br>
        Se alcanzó el máximo de <strong>${result.iterations.length}</strong> iteraciones sin satisfacer la tolerancia. Intenta con más iteraciones o un mejor valor inicial.
      `;
    }
  }

  // Build iterations table
  buildTable(result);

  // Build chart
  buildChart(result, fx);
}

// ======================== ITERATIONS TABLE ========================
function buildTable(result) {
  const method = state.currentMethod;
  let headers = [];
  let rowBuilder;

  switch (method) {
    case 'biseccion':
    case 'falsa-posicion':
      headers = ['n', 'a', 'b', 'c', 'f(a)', 'f(b)', 'f(c)', 'Error'];
      rowBuilder = (iter) => [
        iter.n,
        formatNum(iter.a, 8),
        formatNum(iter.b, 8),
        formatNum(iter.c, 8),
        formatNum(iter.fa, 8),
        formatNum(iter.fb, 8),
        formatNum(iter.fc, 8),
        formatNum(iter.error)
      ];
      break;
    case 'punto-fijo':
      headers = ['n', 'xₙ', 'g(xₙ)', 'f(xₙ)', 'Error'];
      rowBuilder = (iter) => [
        iter.n,
        formatNum(iter.xn, 8),
        formatNum(iter.gxn, 8),
        formatNum(iter.fxn, 8),
        formatNum(iter.error)
      ];
      break;
    case 'newton':
      headers = ['n', 'xₙ', 'f(xₙ)', "f'(xₙ)", 'xₙ₊₁', 'Error'];
      rowBuilder = (iter) => [
        iter.n,
        formatNum(iter.xn, 8),
        formatNum(iter.fxn, 8),
        formatNum(iter.fpxn, 8),
        formatNum(iter.xn1, 8),
        formatNum(iter.error)
      ];
      break;
  }

  dom.tableHead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
  dom.tableBody.innerHTML = result.iterations.map(iter => {
    const cells = rowBuilder(iter);
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  }).join('');
}

// ======================== CHART ========================
function buildChart(result, fx) {
  // Determine plotting range
  let xMin, xMax;
  const root = result.root;

  if (state.currentMethod === 'biseccion' || state.currentMethod === 'falsa-posicion') {
    const a = parseFloat(dom.inputA.value);
    const b = parseFloat(dom.inputB.value);
    const range = b - a;
    xMin = a - range * 0.5;
    xMax = b + range * 0.5;
  } else {
    const spread = Math.max(Math.abs(root) * 0.5, 2);
    xMin = root - spread;
    xMax = root + spread;
  }

  // Generate data points
  const numPoints = 300;
  const step = (xMax - xMin) / numPoints;
  const dataPoints = [];
  const xAxisPoints = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + i * step;
    const y = evalFunc(fx, x);
    if (isFinite(y) && Math.abs(y) < 1e10) {
      dataPoints.push({ x, y });
    }
    xAxisPoints.push({ x, y: 0 });
  }

  // Destroy previous chart
  if (state.chart) {
    state.chart.destroy();
  }

  const ctx = $('#function-chart').getContext('2d');
  const isDark = state.theme === 'dark';

  state.chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: `f(x) = ${fx}`,
          data: dataPoints,
          showLine: true,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.05)',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
          order: 2,
        },
        {
          label: 'y = 0',
          data: xAxisPoints,
          showLine: true,
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          order: 3,
        },
        {
          label: `Raíz ≈ ${formatNum(root, 6)}`,
          data: [{ x: root, y: evalFunc(fx, root) }],
          pointRadius: 8,
          pointHoverRadius: 10,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          showLine: false,
          order: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'x',
            color: isDark ? '#94a3b8' : '#64748b',
            font: { family: "'JetBrains Mono'", size: 12 }
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
          },
          ticks: {
            color: isDark ? '#8892a8' : '#64748b',
            font: { family: "'JetBrains Mono'", size: 10 }
          },
          border: {
            color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'f(x)',
            color: isDark ? '#94a3b8' : '#64748b',
            font: { family: "'JetBrains Mono'", size: 12 }
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
          },
          ticks: {
            color: isDark ? '#8892a8' : '#64748b',
            font: { family: "'JetBrains Mono'", size: 10 }
          },
          border: {
            color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: isDark ? '#e8ecf4' : '#0f172a',
            font: { family: "'Inter'", size: 11 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1a1f35' : '#fff',
          titleColor: isDark ? '#e8ecf4' : '#0f172a',
          bodyColor: isDark ? '#8892a8' : '#475569',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: "'JetBrains Mono'", size: 12 },
          bodyFont: { family: "'JetBrains Mono'", size: 11 },
          callbacks: {
            label: (ctx) => `(${formatNum(ctx.parsed.x, 6)}, ${formatNum(ctx.parsed.y, 6)})`
          }
        }
      }
    }
  });
}

// ======================== CLEAR ========================
function clearAll() {
  dom.form.reset();
  dom.inputTol.value = '0.0001';
  dom.inputMaxIter.value = '100';
  hideValidation();

  // Reset results
  dom.resultsEmpty.classList.remove('hidden');
  dom.tabSummary.classList.add('hidden');
  dom.tabTable.classList.add('hidden');
  dom.tabChart.classList.add('hidden');

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  showToast('Formulario limpiado', 'success');
}

// ======================== THEME ========================
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  localStorage.setItem('raiz-calc-theme', state.theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
}

// ======================== HISTORY ========================
function saveToHistory(result, fx) {
  const entry = {
    id: Date.now(),
    method: result.method,
    methodKey: state.currentMethod,
    fx,
    gx: dom.inputGx.value.trim() || null,
    a: dom.inputA.value || null,
    b: dom.inputB.value || null,
    x0: dom.inputX0.value || null,
    tol: dom.inputTol.value,
    maxIter: dom.inputMaxIter.value,
    root: result.root,
    error: result.error,
    numIters: result.iterations.length,
    converged: result.converged,
    timestamp: new Date().toISOString()
  };

  state.history.unshift(entry);
  if (state.history.length > 50) state.history.pop(); // limit
  localStorage.setItem('raiz-calc-history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    dom.historyList.innerHTML = `
      <div class="history-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p style="margin-top: 1rem;">No hay cálculos en el historial</p>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Los cálculos realizados aparecerán aquí</p>
      </div>
    `;
    return;
  }

  dom.historyList.innerHTML = state.history.map(entry => {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="history-item" data-id="${entry.id}">
        <span class="history-method">${entry.method}</span>
        <div class="history-func">f(x) = ${entry.fx}</div>
        <div class="history-result">
          ${entry.converged ? '✅' : '⚠️'} Raíz ≈ ${formatNum(entry.root, 8)} — ${entry.numIters} iter.
        </div>
        <div class="history-time">${timeStr}</div>
      </div>
    `;
  }).join('');

  // Click to restore
  dom.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const entry = state.history.find(e => e.id === id);
      if (entry) restoreFromHistory(entry);
    });
  });
}

function restoreFromHistory(entry) {
  // Select method
  dom.methodCards.forEach(c => c.classList.remove('active'));
  const card = $(`.method-card[data-method="${entry.methodKey}"]`);
  if (card) card.classList.add('active');
  state.currentMethod = entry.methodKey;
  updateFormForMethod(entry.methodKey);

  // Fill form
  dom.inputFx.value = entry.fx;
  if (entry.gx) dom.inputGx.value = entry.gx;
  if (entry.a) dom.inputA.value = entry.a;
  if (entry.b) dom.inputB.value = entry.b;
  if (entry.x0) dom.inputX0.value = entry.x0;
  dom.inputTol.value = entry.tol;
  dom.inputMaxIter.value = entry.maxIter;

  // Close history
  dom.historyOverlay.classList.add('hidden');

  showToast('Cálculo restaurado del historial', 'success');
}

// ======================== EXAMPLES ========================
const EXAMPLES = [
  {
    title: 'Raíz cúbica clásica',
    fx: 'x^3 - x - 1',
    methods: {
      biseccion: { a: '1', b: '2' },
      'punto-fijo': { gx: '(x + 1)^(1/3)', x0: '1.5' },
      newton: { x0: '1.5' },
      'falsa-posicion': { a: '1', b: '2' },
    },
    desc: 'Encontrar la raíz de x³ - x - 1 = 0'
  },
  {
    title: 'Punto fijo trigonométrico',
    fx: 'cos(x) - x',
    methods: {
      biseccion: { a: '0', b: '1' },
      'punto-fijo': { gx: 'cos(x)', x0: '0.5' },
      newton: { x0: '0.5' },
      'falsa-posicion': { a: '0', b: '1' },
    },
    desc: 'Encontrar x donde cos(x) = x'
  },
  {
    title: 'Exponencial',
    fx: 'exp(-x) - x',
    methods: {
      biseccion: { a: '0', b: '1' },
      'punto-fijo': { gx: 'exp(-x)', x0: '0.5' },
      newton: { x0: '0.5' },
      'falsa-posicion': { a: '0', b: '1' },
    },
    desc: 'Encontrar x donde e⁻ˣ = x'
  },
  {
    title: 'Raíz cuadrada de 2',
    fx: 'x^2 - 2',
    methods: {
      biseccion: { a: '1', b: '2' },
      'punto-fijo': { gx: '(x + 2/x) / 2', x0: '1' },
      newton: { x0: '1.5' },
      'falsa-posicion': { a: '1', b: '2' },
    },
    desc: 'Calcular √2 numéricamente'
  },
  {
    title: 'Seno no lineal',
    fx: 'sin(x) - x/2',
    methods: {
      biseccion: { a: '1', b: '2.5' },
      'punto-fijo': { gx: '2 * sin(x)', x0: '2' },
      newton: { x0: '2' },
      'falsa-posicion': { a: '1', b: '2.5' },
    },
    desc: 'Raíz no trivial de sin(x) = x/2'
  },
  {
    title: 'Logarítmica',
    fx: 'log(x) - 1',
    methods: {
      biseccion: { a: '2', b: '3' },
      'punto-fijo': { gx: 'exp(1)', x0: '2.5' },
      newton: { x0: '2.5' },
      'falsa-posicion': { a: '2', b: '3' },
    },
    desc: 'Encontrar x donde ln(x) = 1 (resultado: e)'
  }
];

function renderExamples() {
  dom.examplesBody.innerHTML = EXAMPLES.map((ex, i) => `
    <div class="example-card" data-index="${i}">
      <div class="example-title">${ex.title}</div>
      <div class="example-detail">f(x) = ${ex.fx}</div>
      <div class="example-desc">${ex.desc}</div>
    </div>
  `).join('');

  dom.examplesBody.querySelectorAll('.example-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.index);
      loadExample(EXAMPLES[idx]);
      dom.examplesModal.classList.add('hidden');
    });
  });
}

function loadExample(example) {
  dom.inputFx.value = example.fx;
  const methodData = example.methods[state.currentMethod];
  if (methodData) {
    if (methodData.a !== undefined) dom.inputA.value = methodData.a;
    if (methodData.b !== undefined) dom.inputB.value = methodData.b;
    if (methodData.gx !== undefined) dom.inputGx.value = methodData.gx;
    if (methodData.x0 !== undefined) dom.inputX0.value = methodData.x0;
  }
  dom.inputTol.value = '0.0001';
  dom.inputMaxIter.value = '100';
  hideValidation();
  showToast(`Ejemplo cargado: ${example.title}`, 'success');
}

// ======================== THEORY ========================
const THEORY = {
  biseccion: {
    title: 'Método de Bisección',
    content: `
      <h3>📌 Descripción</h3>
      <p>El método de bisección es un algoritmo de búsqueda de raíces que divide repetidamente un intervalo por la mitad y selecciona el subintervalo donde la función cambia de signo.</p>

      <h3>📐 Fórmula</h3>
      <span class="formula">c = (a + b) / 2</span>
      <p>En cada iteración, se evalúa f(c) y se reemplaza a o b según el signo:</p>
      <ul>
        <li>Si f(a) × f(c) &lt; 0 → la raíz está en [a, c], entonces b = c</li>
        <li>Si f(a) × f(c) &gt; 0 → la raíz está en [c, b], entonces a = c</li>
      </ul>

      <h3>✅ Condiciones</h3>
      <ul>
        <li>f(x) debe ser continua en [a, b]</li>
        <li>f(a) × f(b) &lt; 0 (Teorema de Bolzano)</li>
      </ul>

      <h3>📊 Convergencia</h3>
      <p>La convergencia es <strong>lineal</strong>. El error se reduce a la mitad en cada iteración:</p>
      <span class="formula">error ≤ (b - a) / 2ⁿ</span>

      <h3>⚡ Ventajas y Desventajas</h3>
      <ul>
        <li>✅ Siempre converge si se cumplen las condiciones</li>
        <li>✅ Simple de implementar</li>
        <li>❌ Convergencia lenta comparada con otros métodos</li>
        <li>❌ Requiere conocer un intervalo donde haya cambio de signo</li>
      </ul>
    `
  },
  'punto-fijo': {
    title: 'Método de Punto Fijo',
    content: `
      <h3>📌 Descripción</h3>
      <p>El método de punto fijo transforma la ecuación f(x) = 0 en la forma x = g(x) y realiza iteraciones sucesivas hasta encontrar un punto donde x = g(x).</p>

      <h3>📐 Fórmula</h3>
      <span class="formula">xₙ₊₁ = g(xₙ)</span>
      <p>Se parte de un valor inicial x₀ y se itera aplicando la función g.</p>

      <h3>✅ Condiciones de Convergencia</h3>
      <ul>
        <li>g(x) debe mapear un intervalo [a, b] en sí mismo</li>
        <li>|g'(x)| &lt; 1 en el entorno de la raíz</li>
        <li>Si |g'(x)| ≥ 1, el método puede divergir</li>
      </ul>

      <h3>📊 Convergencia</h3>
      <p>La convergencia es <strong>lineal</strong> con constante asintótica |g'(r)| donde r es la raíz.</p>
      <span class="formula">|xₙ₊₁ - r| ≤ |g'(r)| × |xₙ - r|</span>

      <h3>💡 Clave</h3>
      <p>La elección de g(x) es crucial. Una misma ecuación f(x) = 0 puede reescribirse como x = g(x) de múltiples formas, no todas convergentes.</p>

      <h3>⚡ Ventajas y Desventajas</h3>
      <ul>
        <li>✅ Simple y elegante</li>
        <li>✅ No requiere derivadas</li>
        <li>❌ Depende de la elección de g(x)</li>
        <li>❌ Puede divergir fácilmente</li>
      </ul>
    `
  },
  newton: {
    title: 'Método de Newton-Raphson',
    content: `
      <h3>📌 Descripción</h3>
      <p>El método de Newton-Raphson usa la línea tangente a f(x) en un punto para aproximar la raíz. Es uno de los métodos más rápidos y populares.</p>

      <h3>📐 Fórmula</h3>
      <span class="formula">xₙ₊₁ = xₙ - f(xₙ) / f'(xₙ)</span>
      <p>En cada iteración, se traza la tangente en xₙ y se toma su intersección con el eje x como nueva aproximación.</p>

      <h3>✅ Condiciones</h3>
      <ul>
        <li>f(x) debe ser diferenciable</li>
        <li>f'(x) ≠ 0 cerca de la raíz</li>
        <li>El valor inicial x₀ debe estar suficientemente cerca de la raíz</li>
      </ul>

      <h3>📊 Convergencia</h3>
      <p>La convergencia es <strong>cuadrática</strong> (muy rápida). El error se eleva al cuadrado en cada iteración:</p>
      <span class="formula">|xₙ₊₁ - r| ≈ C × |xₙ - r|²</span>
      <p>Nota: En esta aplicación, la derivada se calcula numéricamente usando diferencias centrales.</p>

      <h3>⚡ Ventajas y Desventajas</h3>
      <ul>
        <li>✅ Convergencia cuadrática (muy rápida)</li>
        <li>✅ Solo necesita un valor inicial</li>
        <li>❌ Requiere que f'(x) ≠ 0</li>
        <li>❌ Puede divergir si x₀ está lejos de la raíz</li>
        <li>❌ Necesita calcular la derivada</li>
      </ul>
    `
  },
  'falsa-posicion': {
    title: 'Método de Falsa Posición (Regula Falsi)',
    content: `
      <h3>📌 Descripción</h3>
      <p>El método de falsa posición es similar a bisección, pero en lugar de tomar el punto medio, traza una línea recta (secante) entre (a, f(a)) y (b, f(b)) y usa su intersección con el eje x.</p>

      <h3>📐 Fórmula</h3>
      <span class="formula">c = (a × f(b) - b × f(a)) / (f(b) - f(a))</span>
      <p>Al igual que bisección, se actualiza el intervalo según el signo de f(c).</p>

      <h3>✅ Condiciones</h3>
      <ul>
        <li>f(x) debe ser continua en [a, b]</li>
        <li>f(a) × f(b) &lt; 0 (debe haber cambio de signo)</li>
      </ul>

      <h3>📊 Convergencia</h3>
      <p>Generalmente converge más rápido que bisección, pero en algunos casos un extremo del intervalo se mantiene fijo, ralentizando la convergencia. La convergencia es <strong>superlineal</strong>.</p>

      <h3>⚡ Ventajas y Desventajas</h3>
      <ul>
        <li>✅ Siempre converge si se cumplen las condiciones</li>
        <li>✅ Generalmente más rápido que bisección</li>
        <li>❌ Puede ser lento si un extremo se queda fijo</li>
        <li>❌ Requiere conocer un intervalo con cambio de signo</li>
      </ul>
    `
  }
};

function showTheory(method) {
  const theory = THEORY[method];
  if (!theory) return;
  dom.theoryTitle.textContent = theory.title;
  dom.theoryBody.innerHTML = theory.content;
  dom.theoryModal.classList.remove('hidden');
}

// ======================== TOAST ========================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ======================== START ========================
document.addEventListener('DOMContentLoaded', init);
