document.getElementById("predictBtn").addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");

    // 1. Collect and validate data
    const payload = {
        gender: parseInt(document.getElementById("gender").value),
        married: parseInt(document.getElementById("married").value),
        education: parseInt(document.getElementById("education").value),
        credit_history: parseInt(document.getElementById("credit_history").value),
        loan_amount: parseFloat(document.getElementById("loan_amount").value)
    };

    // Check for any null or NaN values
    if (Object.values(payload).some(v => isNaN(v) || v === null)) {
        resultDiv.innerHTML = '<span class="pill rejected">⚠️ Please complete all fields</span>';
        return;
    }

    resultDiv.innerHTML = '<span class="pill">⏳ Predicting...</span>';

    try {
        // UPDATE THIS URL to match your backend port (e.g., http://127.0.0.1:5000/predict)
        const resp = await fetch('http://127.0.0.1:5000/predict', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            resultDiv.innerHTML = `<span class="pill rejected">❌ Server Error (${resp.status})</span>`;
            console.error("Server Response:", txt);
            return;
        }

        const result = await resp.json();
        
        if (result.error) {
            resultDiv.innerHTML = `<span class="pill rejected">❌ ${result.error}</span>`;
            return;
        }

        // Handle logical result display
        const percent = (typeof result.probability === 'number') ? Math.round(result.probability * 100) : null;
        const approved = percent !== null ? percent >= 50 : (result.result === 'Approved');
        
        const statusClass = approved ? "approved" : "rejected";
        const icon = approved ? "✅" : "❌";
        
        resultDiv.innerHTML = `<span class="pill ${statusClass}">${icon} ${result.result || (approved ? 'Approved' : 'Rejected')}</span>`;

    } catch (e) {
        console.error("Connection Error:", e);
        resultDiv.innerHTML = '<span class="pill rejected">❌ Cannot reach server. Is it running?</span>';
    }
});
