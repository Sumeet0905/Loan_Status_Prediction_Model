document.getElementById("predictBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");

  const payload = {
    gender: parseInt(document.getElementById("gender").value || ""),
    married: parseInt(document.getElementById("married").value || ""),
    education: parseInt(document.getElementById("education").value || ""),
    credit_history: parseInt(document.getElementById("credit_history").value || ""),
    loan_amount: parseFloat(document.getElementById("loan_amount").value || "")
  };

  if (Object.values(payload).some(v => v === null || v === '' || Number.isNaN(v))) {
    resultDiv.innerHTML = '<span class="pill rejected">⚠️ Please complete all fields</span>';
    return;
  }

  resultDiv.innerHTML = '<span class="pill">⏳ Predicting...</span>';

  try {
    // FIX: Removed 127.0.0.1 and used relative path for Render deployment
    const resp = await fetch('/predict', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(()=>'');
      resultDiv.innerHTML = `<span class="pill rejected">❌ Server (${resp.status})</span>`;
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
    resultDiv.innerHTML = `${pill}`;

    // Trigger the popup logic
    showPopup(percent, result.result, approved, 3000);

  } catch (e) {
    console.error(e);
    resultDiv.innerHTML = '<span class="pill rejected">❌ Server not responding</span>';
  }
});

function showPopup(percent, resultLabel, approved, ttl=3000){
  const p = (typeof percent === 'number') ? percent : null;
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

  let finalProb = (p !== null) ? (p / 100.0 * 0.6 + heuristic * 0.4) : heuristic;
  const display = Math.round(Math.max(0, Math.min(1, finalProb)) * 100);

  const popup = document.createElement('div');
  popup.className = 'popup-meter';
  popup.innerHTML = `
    <div class="percent">${display}%</div>
    <div class="sub">${display >= 50 ? 'Likely approved' : 'At risk / needs review'}</div>
  `;
  document.body.appendChild(popup);
  
  // Animation timing
  requestAnimationFrame(()=> popup.classList.add('show'));
  setTimeout(()=>{
    popup.classList.remove('show');
    setTimeout(()=> popup.remove(), 420);
  }, ttl);
}
