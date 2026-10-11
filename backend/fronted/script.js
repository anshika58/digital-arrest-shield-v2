/* =========================================================
   DIGITAL ARREST SHIELD
   FINAL SCRIPT.JS
   ========================================================= */

/*
   Backend address:
   - Opened from the FastAPI server itself (port 8000) or from https (Render)
     -> use the same address as the page.
   - Opened any other way (e.g. VS Code Live Server on port 5500)
     -> talk to the local backend.
*/
const BACKEND_URL = (
    location.port === "8000" || location.protocol === "https:"
)
    ? location.origin
    : "http://127.0.0.1:8000";


/* =========================================================
   COMMON HELPERS
   ========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showBox(box, html) {
    if (!box) {
        console.error("Result box not found.");
        return;
    }

    box.innerHTML = html;
    box.removeAttribute("hidden");

    box.style.setProperty("display", "block", "important");
    box.style.setProperty("visibility", "visible", "important");
    box.style.setProperty("opacity", "1", "important");
    box.style.setProperty("height", "auto", "important");
    box.style.setProperty("max-height", "none", "important");
}


function riskIcon(level) {
    level = String(level || "").toUpperCase();

    if (level === "HIGH") {
        return "🚨";
    }

    if (level === "MEDIUM") {
        return "⚠️";
    }

    return "🛡️";
}


function boolValue(value) {
    return String(value).toLowerCase() === "true";
}


/* =========================================================
   BACKEND
   ========================================================= */

async function readJSON(response) {
    try {
        return await response.json();
    } catch (error) {
        console.error("JSON ERROR:", error);
        throw new Error("Backend ne valid JSON response nahi diya.");
    }
}


/* 8-question checker -> /detect-scam */
async function sendToBackend(payload) {
    console.log("Sending payload to backend:", payload);

    let response;

    try {
        response = await fetch(`${BACKEND_URL}/detect-scam`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("FETCH ERROR:", error);

        throw new Error(
            "Backend se connection nahi ho pa raha. FastAPI running hai ya nahi check karo."
        );
    }

    const data = await readJSON(response);

    console.log("Backend response:", data);

    if (!response.ok) {
        throw new Error(
            data.detail || data.message || `Backend Error ${response.status}`
        );
    }

    return data;
}


/*
   Free text (WhatsApp / SMS message, screenshot text) -> /voice-detect
   The backend finds the scam signals itself (Hindi, English and Hinglish,
   kidnap / family-emergency threats included).
*/
async function analyzeTextOnBackend(text) {
    let response;

    try {
        response = await fetch(`${BACKEND_URL}/voice-detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: String(text || "").slice(0, 3000) })
        });
    } catch (error) {
        console.error("FETCH ERROR:", error);

        throw new Error(
            "Backend se connection nahi ho pa raha. FastAPI running hai ya nahi check karo."
        );
    }

    const data = await readJSON(response);

    console.log("Text analysis response:", data);

    if (!response.ok) {
        throw new Error(
            data.detail || data.message || `Backend Error ${response.status}`
        );
    }

    return data;
}


/* =========================================================
   AI ADVICE FORMATTER
   ========================================================= */

function formatAdvice(text) {
    const headings = [
        "What this means",
        "Why it is suspicious",
        "What to do now",
        "What not to do",
        "Evidence to save",
        "Where to report"
    ];

    let html = "";
    let inList = false;

    String(text || "").split("\n").forEach(function(raw) {
        const line = raw.trim().replace(/\*\*/g, "");

        if (!line) {
            return;
        }

        const heading = headings.find(function(h) {
            return line.toLowerCase().startsWith(h.toLowerCase());
        });

        if (heading) {
            if (inList) {
                html += "</ul>";
                inList = false;
            }

            html += `<h4>${escapeHTML(heading)}</h4>`;

            const rest = line
                .slice(heading.length)
                .replace(/^[:\s-]+/, "");

            if (rest) {
                html += `<p>${escapeHTML(rest)}</p>`;
            }

            return;
        }

        if (/^([-•*]|\d+[.)])\s+/.test(line)) {
            if (!inList) {
                html += "<ul>";
                inList = true;
            }

            html += `<li>${escapeHTML(
                line.replace(/^([-•*]|\d+[.)])\s+/, "")
            )}</li>`;

            return;
        }

        if (inList) {
            html += "</ul>";
            inList = false;
        }

        html += `<p>${escapeHTML(line)}</p>`;
    });

    if (inList) {
        html += "</ul>";
    }

    return html;
}


/* =========================================================
   LOAD AI ADVICE
   ========================================================= */

async function loadAIAdvice(box, data, userText) {
    if (!box) {
        return;
    }

    const old = box.querySelector(".ai-advice-box");

    if (old) {
        old.remove();
    }

    const aiBox = document.createElement("div");

    aiBox.className = "ai-advice-box";

    aiBox.innerHTML = `
        <h3>🤖 AI Safety Advisor</h3>
        <p class="ai-loading">AI is preparing advice for you...</p>
    `;

    box.appendChild(aiBox);

    try {
        const response = await fetch(`${BACKEND_URL}/ai-advice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_question: String(userText || "").slice(0, 1500),
                risk_score: Number(data.risk_score ?? 0),
                risk_level: String(data.risk_level || "LOW"),
                red_flags: Array.isArray(data.red_flags) ? data.red_flags : []
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "AI request failed");
        }

        aiBox.innerHTML = `
            <h3>🤖 AI Safety Advisor</h3>

            <div class="ai-advice-text">
                ${formatAdvice(result.advice)}
            </div>

            <p class="ai-note">
                AI guidance is for awareness only.
                For real financial cyber fraud in India, call 1930.
            </p>
        `;

    } catch (error) {
        console.error("AI ADVICE ERROR:", error);

        aiBox.innerHTML = `
            <h3>🤖 AI Safety Advisor</h3>

            <p>
                AI advice is unavailable right now.
                End the suspicious interaction, do not send money
                or OTP, and verify the caller independently.
            </p>

            <p class="ai-note">
                For financial cyber fraud in India, call 1930.
            </p>
        `;
    }
}


/* =========================================================
   RENDER RISK RESULT
   ========================================================= */

function renderRiskResult(box, data, userText) {
    if (!box) {
        return;
    }

    const level = String(
        data.risk_level || data.riskLevel || "LOW"
    ).toUpperCase();

    const score = data.risk_score ?? data.riskScore ?? 0;

    const scamDetected = data.scam_detected ?? data.scamDetected ?? false;

    const redFlags = Array.isArray(data.red_flags) ? data.red_flags : [];

    const safetyActions = Array.isArray(data.safety_actions)
        ? data.safety_actions
        : [];

    let flagsHTML = "";

    if (redFlags.length > 0) {
        flagsHTML = `
            <div class="result-section">
                <h3>🚩 Red Flags Detected</h3>
                <ul>
                    ${redFlags.map(function(flag) {
                        return `<li>${escapeHTML(flag)}</li>`;
                    }).join("")}
                </ul>
            </div>
        `;
    } else {
        flagsHTML = `
            <div class="result-section">
                <h3>🚩 Red Flags</h3>
                <p>No major red flags detected.</p>
            </div>
        `;
    }

    let actionsHTML = "";

    if (safetyActions.length > 0) {
        actionsHTML = `
            <div class="result-section">
                <h3>🛡️ Safety Actions</h3>
                <ul>
                    ${safetyActions.map(function(action) {
                        return `<li>${escapeHTML(action)}</li>`;
                    }).join("")}
                </ul>
            </div>
        `;
    }

    const riskClass =
        level === "HIGH"
            ? "risk-high"
            : level === "MEDIUM"
                ? "risk-medium"
                : "risk-low";

    const html = `
        <div class="${riskClass}">

            <h2>${riskIcon(level)} ${escapeHTML(level)} RISK</h2>

            <div class="score">${escapeHTML(score)}%</div>

            <p>
                <strong>Scam Detected:</strong>
                ${scamDetected ? "Yes" : "No"}
            </p>

            ${
                data.report_id !== undefined
                    ? `<p><strong>Report ID:</strong> ${escapeHTML(data.report_id)}</p>`
                    : ""
            }

            ${flagsHTML}

            ${actionsHTML}

        </div>
    `;

    showBox(box, html);

    console.log("FINAL RESULT DISPLAYED:", box);

    /* AI advice starts after the normal result is displayed. */
    loadAIAdvice(box, data, userText || "");
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function() {

    console.log("=================================");
    console.log("DIGITAL ARREST SHIELD STARTED");
    console.log("BACKEND_URL:", BACKEND_URL);
    console.log("=================================");


    /* =====================================================
       SCAM CHECKER (8 questions)
       ===================================================== */

    const questions = document.querySelectorAll(".question");

    const analyzeButton = document.getElementById("analyzeBtn");

    const resultBox = document.getElementById("result");


    /* ---------- question buttons ---------- */

    document
        .querySelectorAll(".question .options button")
        .forEach(function(button) {

            button.type = "button";

            button.addEventListener("click", function(event) {

                event.preventDefault();
                event.stopPropagation();

                const parent = this.closest(".options");

                if (!parent) {
                    return;
                }

                parent.querySelectorAll("button").forEach(function(btn) {
                    btn.classList.remove("selected");
                });

                this.classList.add("selected");

                console.log("Selected:", this.dataset.value);
            });
        });


    /* ---------- analyze interaction ---------- */

    if (analyzeButton && resultBox) {

        analyzeButton.type = "button";

        analyzeButton.addEventListener("click", async function(event) {

            event.preventDefault();
            event.stopPropagation();

            console.log("ANALYZE BUTTON CLICKED");

            showBox(
                resultBox,
                `
                    <div>
                        <h3>🔍 Analyzing Interaction...</h3>
                        <p>Please wait...</p>
                    </div>
                `
            );

            const payload = {};

            questions.forEach(function(question) {

                const key = question.dataset.key;

                if (!key) {
                    return;
                }

                const selected = question.querySelector(
                    ".options button.selected"
                );

                if (!selected) {

                    payload[key] = key === "caller_claim" ? "" : false;

                    return;
                }

                const value = selected.dataset.value;

                payload[key] =
                    key === "caller_claim" ? value : boolValue(value);
            });

            console.log("CHECKER PAYLOAD:", payload);

            try {

                const data = await sendToBackend(payload);

                renderRiskResult(
                    resultBox,
                    data,
                    "Caller claimed to be: " +
                    (payload.caller_claim || "unknown")
                );

            } catch (error) {

                console.error("CHECKER ERROR:", error);

                showBox(
                    resultBox,
                    `
                        <div class="risk-medium">
                            <h2>⚠️ Analysis Error</h2>
                            <p>${escapeHTML(error.message)}</p>
                            <p>Make sure FastAPI is running at:</p>
                            <strong>${escapeHTML(BACKEND_URL)}</strong>
                        </div>
                    `
                );
            }
        });
    }


    /* =====================================================
       WHATSAPP / SMS ANALYZER
       ===================================================== */

    const messageInput = document.getElementById("messageInput");

    const analyzeMessageButton = document.getElementById("analyzeMessageBtn");

    const messageResult = document.getElementById("messageResult");

    if (analyzeMessageButton && messageInput && messageResult) {

        analyzeMessageButton.type = "button";

        analyzeMessageButton.addEventListener("click", async function(event) {

            event.preventDefault();
            event.stopPropagation();

            console.log("MESSAGE ANALYZE CLICKED");

            const message = messageInput.value.trim();

            if (!message) {

                showBox(
                    messageResult,
                    `
                        <div class="risk-medium">
                            <h3>⚠️ Message Required</h3>
                            <p>Pehle WhatsApp/SMS message paste karo.</p>
                        </div>
                    `
                );

                return;
            }

            showBox(
                messageResult,
                `
                    <h3>🔍 Analyzing Message...</h3>
                    <p>Please wait...</p>
                `
            );

            try {

                const data = await analyzeTextOnBackend(message);

                renderRiskResult(messageResult, data, message);

            } catch (error) {

                console.error("MESSAGE ERROR:", error);

                showBox(
                    messageResult,
                    `
                        <div class="risk-medium">
                            <h3>⚠️ Message Analysis Failed</h3>
                            <p>${escapeHTML(error.message)}</p>
                        </div>
                    `
                );
            }
        });

    } else {

        console.error("MESSAGE ANALYZER ELEMENT MISSING");
    }


    /* =====================================================
       SCREENSHOT
       ===================================================== */

    const screenshotInput = document.getElementById("screenshotInput");

    const screenshotPreview = document.getElementById("screenshotPreview");

    const analyzeScreenshotButton = document.getElementById(
        "analyzeScreenshotBtn"
    );

    const screenshotResult = document.getElementById("screenshotResult");


    /* ---------- preview ---------- */

    if (screenshotInput) {

        screenshotInput.addEventListener("change", function() {

            const file = this.files && this.files[0];

            if (!file) {
                return;
            }

            const reader = new FileReader();

            reader.onload = function(event) {

                if (!screenshotPreview) {
                    return;
                }

                screenshotPreview.innerHTML = `
                    <img src="${event.target.result}" alt="Screenshot Preview">
                `;
            };

            reader.readAsDataURL(file);
        });
    }


    /* ---------- screenshot analysis ---------- */

    if (analyzeScreenshotButton && screenshotInput && screenshotResult) {

        analyzeScreenshotButton.type = "button";

        analyzeScreenshotButton.addEventListener("click", async function(event) {

            event.preventDefault();
            event.stopPropagation();

            const file = screenshotInput.files && screenshotInput.files[0];

            if (!file) {

                showBox(
                    screenshotResult,
                    `
                        <div class="risk-medium">
                            <h3>⚠️ Screenshot Required</h3>
                            <p>Pehle screenshot select karo.</p>
                        </div>
                    `
                );

                return;
            }

            showBox(
                screenshotResult,
                `
                    <h3>📸 Reading Screenshot...</h3>
                    <p>OCR text read kar raha hai...</p>
                `
            );

            try {

                if (typeof Tesseract === "undefined") {
                    throw new Error("Tesseract OCR load nahi hua.");
                }

                /* English + Hindi text in screenshots */
                const ocrResult = await Tesseract.recognize(
                    file,
                    "eng+hin",
                    {
                        logger: function(info) {

                            if (info.status === "recognizing text") {

                                const progress = Math.round(
                                    (info.progress || 0) * 100
                                );

                                showBox(
                                    screenshotResult,
                                    `
                                        <h3>📸 Reading Screenshot...</h3>
                                        <p>OCR Progress: ${progress}%</p>
                                    `
                                );
                            }
                        }
                    }
                );

                const extractedText = ocrResult?.data?.text || "";

                if (!extractedText.trim()) {

                    showBox(
                        screenshotResult,
                        `
                            <div class="risk-medium">
                                <h3>⚠️ No Text Found</h3>
                                <p>Screenshot me readable text nahi mila.</p>
                            </div>
                        `
                    );

                    return;
                }

                const data = await analyzeTextOnBackend(extractedText);

                const flags = Array.isArray(data.red_flags)
                    ? data.red_flags
                    : [];

                const actions = Array.isArray(data.safety_actions)
                    ? data.safety_actions
                    : [];

                showBox(
                    screenshotResult,
                    `
                        <h3>📄 Extracted Text</h3>

                        <div class="ocr-text">${escapeHTML(extractedText)}</div>

                        <hr style="margin:20px 0;border-color:#28465e;">

                        <h2>
                            ${riskIcon(data.risk_level)}
                            ${escapeHTML(data.risk_level || "LOW")} RISK
                        </h2>

                        <div class="score">
                            ${escapeHTML(data.risk_score ?? 0)}%
                        </div>

                        <p>
                            <strong>Scam Detected:</strong>
                            ${data.scam_detected ? "Yes" : "No"}
                        </p>

                        ${
                            flags.length
                                ? `
                                    <h3>🚩 Red Flags</h3>
                                    <ul>
                                        ${flags.map(function(flag) {
                                            return `<li>${escapeHTML(flag)}</li>`;
                                        }).join("")}
                                    </ul>
                                `
                                : ""
                        }

                        ${
                            actions.length
                                ? `
                                    <h3>🛡️ Safety Actions</h3>
                                    <ul>
                                        ${actions.map(function(action) {
                                            return `<li>${escapeHTML(action)}</li>`;
                                        }).join("")}
                                    </ul>
                                `
                                : ""
                        }
                    `
                );

                /* Screenshot ke extracted text ko AI ko bhejna. */
                loadAIAdvice(screenshotResult, data, extractedText);

            } catch (error) {

                console.error("SCREENSHOT ERROR:", error);

                showBox(
                    screenshotResult,
                    `
                        <div class="risk-medium">
                            <h3>⚠️ Screenshot Analysis Failed</h3>
                            <p>${escapeHTML(error.message)}</p>
                        </div>
                    `
                );
            }
        });
    }


    /* =====================================================
       VIDEO CALL SIMULATOR
       ===================================================== */

    const simConversation = document.getElementById("sim-conversation");

    const simOptions = document.getElementById("sim-options");

    const simResult = document.getElementById("sim-result");

    const restartSimulator = document.getElementById("restart-simulator");


    const simulatorData = [

        {
            caller: "Hello. I am calling from the Cyber Crime Department.",
            options: [
                {
                    text: "Okay, please tell me what happened.",
                    response: "The caller says there is a serious case against you.",
                    risk: false
                },
                {
                    text: "I will verify your identity first.",
                    response: "The caller becomes urgent and pressures you.",
                    risk: true
                }
            ]
        },

        {
            caller: "Your details are linked to an illegal case. You may be arrested.",
            options: [
                {
                    text: "I will visit the police station directly.",
                    response: "The caller tries to stop independent verification.",
                    risk: true
                },
                {
                    text: "I will share my OTP to clear the case.",
                    response: "Never share OTPs or banking information.",
                    risk: true
                }
            ]
        },

        {
            caller: "Stay on the video call and transfer the required amount immediately.",
            options: [
                {
                    text: "I will transfer the money.",
                    response: "This is a major warning sign.",
                    risk: true
                },
                {
                    text: "I will end the call and verify independently.",
                    response: "Good safety practice.",
                    risk: false
                }
            ]
        }

    ];


    let simulatorStep = 0;


    function addSimulatorMessage(speaker, message, className) {

        if (!simConversation) {
            return;
        }

        const div = document.createElement("div");

        div.className = `sim-message ${className}`;

        div.innerHTML = `
            <div class="sim-speaker">${escapeHTML(speaker)}</div>
            <div>${escapeHTML(message)}</div>
        `;

        simConversation.appendChild(div);

        simConversation.scrollTop = simConversation.scrollHeight;
    }


    function loadSimulator() {

        if (!simOptions) {
            return;
        }

        simOptions.innerHTML = "";

        if (simulatorStep >= simulatorData.length) {

            showBox(
                simResult,
                `
                    <h3>🛡️ Simulation Complete</h3>

                    <p>
                        Verify independently and never
                        share OTPs, banking information,
                        or transfer money because of pressure.
                    </p>
                `
            );

            return;
        }

        const step = simulatorData[simulatorStep];

        addSimulatorMessage("Caller", step.caller, "caller-message");

        step.options.forEach(function(option) {

            const button = document.createElement("button");

            button.type = "button";

            button.className = "sim-choice";

            button.textContent = option.text;

            button.addEventListener("click", function(event) {

                event.preventDefault();
                event.stopPropagation();

                addSimulatorMessage("You", option.text, "user-message");

                addSimulatorMessage("Caller", option.response, "caller-message");

                if (option.risk) {

                    showBox(
                        simResult,
                        `
                            <h3>🚨 Suspicious Behaviour</h3>
                            <p>This interaction contains a scam warning sign.</p>
                        `
                    );
                }

                simulatorStep++;

                loadSimulator();
            });

            simOptions.appendChild(button);
        });
    }


    if (restartSimulator) {

        restartSimulator.type = "button";

        restartSimulator.addEventListener("click", function(event) {

            event.preventDefault();
            event.stopPropagation();

            simulatorStep = 0;

            if (simConversation) {
                simConversation.innerHTML = "";
            }

            if (simResult) {
                simResult.innerHTML = "";
                simResult.style.display = "none";
            }

            loadSimulator();
        });
    }


    if (simConversation && simOptions) {
        loadSimulator();
    }


    console.log("All Digital Arrest Shield features initialized.");

});