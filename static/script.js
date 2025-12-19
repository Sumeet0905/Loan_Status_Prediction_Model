// Main click handler for the predict button
document.getElementById("predictBtn").addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");

    // Gather input values
    const payload = {
        gender: parseInt(document.getElementById("gender").value) || NaN,
        married: parseInt(document.getElementById("married").value) || NaN,
        education: parseInt(document.getElementById("education").value) || NaN,
        credit_history: parseInt(document.getElementById("credit_history").value) || NaN,
        loan_amount: parseFloat(document.getElementById("loan_amount").value) || NaN
    };

    // Validate inputs
    if (Object.values(payload).some(v => Number.isNaN(v))) {
        resultDiv.innerHTML = '<span class="pill rejected">⚠️ Please complete all fields</span>';
        return;
    }

    resultDiv.innerHTML = '<span class="pill">⏳ Predicting...</span>';

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const txt = await response.text().catch(() => '');
            resultDiv.innerHTML = `<span class="pill rejected">❌ Server (${response.status})</span>
                                   <div style="font-size:12px;color:#9aa5b1;margin-top:8px">${txt}</div>`;
            return;
        }

        const result = await response.json();

        if (result.error) {
            resultDiv.innerHTML = `<span class="pill rejected">❌ ${result.error}</span>`;
            return;
        }

        const percent = (typeof result.probability === 'number') ? Math.round(result.probability * 100) : null;
        const approved = percent !== null ? percent >= 50 : (result.result === 'Approved');
        resultDiv.innerHTML = approved
            ? `<span class="pill approved">✅ ${result.result}</span>`
            : `<span class="pill rejected">❌ ${result.result}</span>`;

        showPopup(percent, result.result, approved, 3000);
    } catch (e) {
        console.error(e);
        resultDiv.innerHTML = '<span class="pill rejected">❌ Server not responding</span>';
    }
});

// Function to render animated gauge
function renderGaugeAnimated(percent, targetId, isOverlay = false) {
    const container = document.getElementById(targetId);
    if (!container) return;

    const displayPercent = (typeof percent === 'number') ? percent : 0;
    const strokeColor = ['#f43f5e', '#12b886'];
    const dashTotal = 565;

    container.innerHTML = `
        ${isOverlay ? `<div class="title">Approval Meter</div>` : ''}
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

    requestAnimationFrame(() => {
        if (arc) {
            arc.style.transition = 'stroke-dashoffset 2s cubic-bezier(.22,.9,.3,1)';
            arc.style.strokeDashoffset = Math.round(dashTotal - (displayPercent / 100) * dashTotal);
        }
        if (needle) {
            needle.style.transition = 'transform 2s cubic-bezier(.22,.9,.3,1)';
            needle.style.transform = `rotate(${-90 + (displayPercent / 100) * 180}deg)`;
        }

        // Animate numeric text
        const start = performance.now();
        const duration = 2000;
        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const value = Math.round(eased * displayPercent);
            if (pctText) pctText.textContent = value + '%';
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    });

    if (isOverlay) container.setAttribute('aria-hidden', 'false');
}

// Function to show popup meter
function showPopup(percent, resultLabel, approved, ttl = 3000) {
    const p = (typeof percent === 'number') ? percent : null;

    const gender = parseInt(document.getElementById("gender").value || "");
    const married = parseInt(document.getElementById("married").value || "");
    const education = parseInt(document.getElementById("education").value || "");
    const credit_history = parseInt(document.getElementById("credit_history").value || "");
    const loan_amount = parseFloat(document.getElementById("loan_amount").value || "0");

    // Heuristic probability calculation
    let heuristic = 0.45;
    if (married === 1) heuristic += 0.08;
    if (education === 1) heuristic += 0.06;
    if (credit_history === 1) heuristic += 0.35;
    const loanFactor = Math.min(1, Math.max(0, loan_amount / 200000));
    heuristic -= loanFactor * 0.15;
    heuristic = Math.max(0, Math.min(1, heuristic));

    const finalProb = p !== null ? Math.max(0, Math.min(1, p / 100 * 0.6 + heuristic * 0.4)) : heuristic;
    const display = Math.round(finalProb * 100);

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'popup-meter';
    popup.innerHTML = `
        <div class="percent">${display}%</div>
        <div class="sub">${display >= 50 ? 'Likely approved' : 'At risk / needs review'}</div>
    `;
    document.body.appendChild(popup);

    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 420);
    }, ttl);
}
