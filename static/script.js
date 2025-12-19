document.getElementById("predictBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");

  // 1. Capture Inputs
  const payload = {
    gender: parseInt(document.getElementById("gender").value),
    married: parseInt(document.getElementById("married").value),
    education: parseInt(document.getElementById("education").value),
    credit_history: parseInt(document.getElementById("credit_history").value),
    loan_amount: parseFloat(document.getElementById("loan_amount").value)
  };

  // 2. Validation
  if (Object.values(payload).some(v => isNaN(v))) {
    resultDiv.innerHTML = '<span class="pill rejected">⚠️ Please complete all fields</span>';
    return;
  }

  resultDiv.innerHTML = '<span class="pill">⏳ Predicting...</span>';

  try {
    // Relative path works perfectly on Render
    const resp = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }

    const result = await resp.json();
    
    if (result.error) {
      resultDiv.innerHTML = `<span class="pill rejected">❌ ${result.error}</span>`;
      return;
    }

    // 3. UI Update
    const isApproved = result.result === 'Approved';
    const pillClass = isApproved ? "approved" : "rejected";
    const icon = isApproved ? "✅" : "❌";
    
    resultDiv.innerHTML = `<span class="pill ${pillClass}">${icon} ${result.result}</span>`;

  } catch (e) {
    console.error("Fetch error:", e);
    resultDiv.innerHTML = '<span class="pill rejected">❌ Server Unreachable</span>';
  }
});
