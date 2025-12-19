document.getElementById("predictBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");

  const payload = {
    gender: parseInt(document.getElementById("gender").value),
    married: parseInt(document.getElementById("married").value),
    education: parseInt(document.getElementById("education").value),
    credit_history: parseInt(document.getElementById("credit_history").value),
    loan_amount: parseFloat(document.getElementById("loan_amount").value)
  };

  // Improved validation check
  if (Object.values(payload).some(v => isNaN(v) || v === null)) {
    resultDiv.innerHTML = '<span class="pill rejected">⚠️ Please complete all fields</span>';
    return;
  }

  resultDiv.innerHTML = '<span class="pill">⏳ Predicting...</span>';

  try {
    // Explicitly point to the Flask backend port
    const resp = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(()=>'');
      resultDiv.innerHTML = `<span class="pill rejected">❌ Server Error (${resp.status})</span>`;
      return;
    }

    const result = await resp.json();
    if (result.error) {
      resultDiv.innerHTML = `<span class="pill rejected">❌ ${result.error}</span>`;
      return;
    }

    // Handle results and probability
    const percent = (typeof result.probability === 'number') ? Math.round(result.probability * 100) : null;
    const approved = result.result === 'Approved';
    const pill = approved ? `<span class="pill approved">✅ ${result.result}</span>` : `<span class="pill rejected">❌ ${result.result}</span>`;
    
    resultDiv.innerHTML = pill;

  } catch (e) {
    console.error("Connection error:", e);
    resultDiv.innerHTML = '<span class="pill rejected">❌ Server not responding. Check your terminal!</span>';
  }
});
