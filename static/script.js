document.getElementById("predictBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");

  const payload = {
    gender: parseInt(document.getElementById("gender").value) || NaN,
    married: parseInt(document.getElementById("married").value) || NaN,
    education: parseInt(document.getElementById("education").value) || NaN,
    credit_history: parseInt(document.getElementById("credit_history").value) || NaN,
    loan_amount: parseFloat(document.getElementById("loan_amount").value) || NaN
  };

  if (Object.values(payload).some(v => Number.isNaN(v))) {
    resultDiv.innerHTML = '<span class="pill rejected">⚠️ Please complete all fields</span>';
    return;
  }

  resultDiv.innerHTML = '<span class="pill">⏳ Predicting...</span>';

  try {
    const resp = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(()=>'');
      resultDiv.innerHTML = `<span class="pill rejected">❌ Server (${resp.status})</span><div style="font-size:12px;color:#9aa5b1;margin-top:8px">${txt}</div>`;
      return;
    }

    const result = await resp.json();
    if (result.error) {
      resultDiv.innerHTML = `<span class="pill rejected">❌ ${result.error}</span>`;
      return;
    }

    const percent = (typeof result.probability === 'number') ? Math.round(result.probability*100) : null;
    const approved = percent !== null ? percent >= 50 : (result.result === 'Approved');

    const pill = approved ? `<span class="pill approved">✅ ${result.result}</span>` : `<span class="pill rejected">❌ ${result.result}</span>`;
    resultDiv.innerHTML = pill;

    showPopup(percent, result.result, approved, 3000);

  } catch (e) {
    console.error(e);
    resultDiv.innerHTML = '<span class="pill rejected">❌ Server not responding</span>';
  }
});

// Gauge and popup functions remain the same
function renderGaugeAnimated(percent, targetId, isOverlay=false) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const displayPercent = (typeof percent === 'number') ? percent : 0;
  const strokeColor = ['#f43f5e','#12b886'];
  const dashTotal = 565;

  const titleHtml = isOverlay ? `<div class="title">Approval Meter</div>` : '';
  container.innerHTML = `
    ${titleHtml}
    <div class="g-inner">
      <div class="g-wrap">
        <svg viewBox="0 0 180 90" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gGrad-${targetId}" x1="0" x2="1">
              <stop offset="0" stop-color="${strokeColor[0]}"/>
              <stop offset="1" stop-color="${strokeColor[1]}"/>
            </linearGradient>
          </defs>
          <path class="g-bg" d="M10 80 A80 80 0 0 1 170 80" fill="none" stroke="#eef3fb" stroke-width="12" stroke-linecap="round"/>
          <path class="g-col" d="M10 80 A80 80 0 0 1 170 80" fill="none" stroke="url(#gGrad-${targetId})" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dashTotal}" stroke-dashoffset="${dashTotal}"/>
          <g class="gauge-labels"><text x="8" y="86">0%</text><text x="80" y="18">50%</text><text x="152" y="86">100%</text></g>
          <g class="needle-group" transform="translate(90,80)">
            <rect x="-2" y="-60" width="4" height="60" rx="2" fill="#0b1720" class="needle" style="transform: rotate(-90deg);" />
            <circle cx="0" cy="0" r="6" fill="#0b1720"/>
          </g>
        </svg>
      </div>
      <div class="prob-text">0%</div>
    </div>
  `;

  const arc = container.querySelector('.g-col');
  const needle = container.querySelector('.needle');
  const pctText = container.querySelector('.prob-text');

  requestAnimationFrame(()=> {
    if(arc){
      arc.style.transition = 'stroke-dashoffset 2s cubic-bezier(.22,.9,.3,1)';
      const targetOffset = Math.round(dashTotal - (displayPercent/100)*dashTotal);
      arc.style.strokeDashoffset = targetOffset;
    }
    if(needle){
      needle.style.transition = 'transform 2s cubic-bezier(.22,.9,.3,1)';
      const angle = -90 + (displayPercent/100)*180;
      needle.style.transform = `rotate(${angle}deg)`;
    }

    const duration = 2000;
    const start = performance.now();
    const from = 0;
    const to = displayPercent;
    function tick(now){
      const t = Math.min(1, (now - start)/duration);
      const eased = t<.5 ? 2*t*t : -1 + (4-2*t)*t;
      const value = Math.round(from + (to - from)*eased);
      if(pctText) pctText.textContent = value + '%';
      if(t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  if (isOverlay) container.setAttribute('aria-hidden','false');
}

function showPopup(percent, resultLabel, approved, ttl=3000){
  const p = (typeof percent === 'number') ? percent : null;

  const gender = parseInt(document.getElementById("gender").value || "");
  const married = parseInt(document.getElementById("married").value || "");
  const education = parseInt(document.getElementById("education").value || "");
  const credit_history = parseInt(document.getElementById("credit_history").value || "");
  const loan_amount = parseFloat(document.getElementById("loan_amount").value || "0");

  let heuristic = 0.45;
  if (married === 1) heuristic += 0.08;
  if (education === 1) heuristic += 0.06;
  if (credit_history === 1) heuristic += 0.35;
  const loanFactor = Math.min(1, Math.max(0, loan_amount / 200000));
  heuristic -= loanFactor * 0.15;
  heuristic = Math.max(0, Math.min(1, heuristic));

  let finalProb;
  if (p !== null) {
    const serverProb = p / 100.0;
    finalProb = Math.max(0, Math.min(1, serverProb * 0.6 + heuristic * 0.4));
  } else {
    finalProb = heuristic;
  }

  const display = Math.round(finalProb * 100);

  const popup = document.createElement('div');
  popup.className = 'popup-meter';
  popup.innerHTML = `
    <div class="percent">${display}%</div>
    <div class="sub">${display >= 50 ? 'Likely approved' : 'At risk / needs review'}</div>
  `;
  document.body.appendChild(popup);
  requestAnimationFrame(()=> popup.classList.add('show'));
  setTimeout(()=> {
    popup.classList.remove('show');
    setTimeout(()=> popup.remove(), 420);
  }, ttl);
}
