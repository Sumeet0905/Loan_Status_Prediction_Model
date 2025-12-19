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

  } catch (e) {
    console.error(e);
    resultDiv.innerHTML = '<span class="pill rejected">❌ Server not responding</span>';
  }
});
