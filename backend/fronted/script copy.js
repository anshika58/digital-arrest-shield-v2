console.log("Digital Arrest Shield loaded successfully!");


// =====================================================
// BACKEND URL
// =====================================================

const BACKEND_URL = "http://127.0.0.1:8000";


// =====================================================
// HELPER: ESCAPE HTML
// =====================================================

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


// =====================================================
// OPTION SELECTION
// =====================================================

const optionButtons =
    document.querySelectorAll("#checker .options button");


optionButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        const question =
            button.closest(".question");

        if (!question) {
            return;
        }

        const buttons =
            question.querySelectorAll("button");

        buttons.forEach(function (btn) {
            btn.classList.remove("selected");
        });

        button.classList.add("selected");

    });

});


// =====================================================
// GET SELECTED VALUE
// =====================================================

function getSelectedValue(questionSelector) {

    const question =
        document.querySelector(questionSelector);

    if (!question) {
        return null;
    }

    const selected =
        question.querySelector(".selected");

    if (!selected) {
        return null;
    }

    return selected.dataset.value || selected.textContent.trim();
}


// =====================================================
// SCAM CHECKER
// =====================================================

const analyzeButton =
    document.querySelector("#analyzeBtn");

const resultBox =
    document.querySelector("#result");


if (analyzeButton) {

    analyzeButton.addEventListener("click", async function () {

        // ---------------------------------------------
        // Get all 8 answers
        // ---------------------------------------------

        const questions =
            document.querySelectorAll("#checker .question");

        let unanswered = 0;

        questions.forEach(function (question) {

            if (!question.querySelector(".selected")) {
                unanswered++;
            }

        });


        // ---------------------------------------------
        // Check all questions
        // ---------------------------------------------

        if (unanswered > 0) {

            resultBox.style.display = "block";

            resultBox.innerHTML = `

                <h3>⚠️ Please answer all questions</h3>

                <p>
                    Please complete all ${questions.length}
                    questions before analyzing the interaction.
                </p>

            `;

            return;
        }


        // ---------------------------------------------
        // Read answers
        // ---------------------------------------------

        const interactionType =
            getSelectedValue(".question:nth-of-type(1)");

        const authority =
            getSelectedValue(".question:nth-of-type(2)");

        const threatenedArrest =
            getSelectedValue(".question:nth-of-type(3)") === "yes";

        const demandedMoney =
            getSelectedValue(".question:nth-of-type(4)") === "yes";

        const askedOtpBank =
            getSelectedValue(".question:nth-of-type(5)") === "yes";

        const forcedVideoCall =
            getSelectedValue(".question:nth-of-type(6)") === "yes";

        const createdUrgency =
            getSelectedValue(".question:nth-of-type(7)") === "yes";

        const askedInstallApp =
            getSelectedValue(".question:nth-of-type(8)") === "yes";


        // ---------------------------------------------
        // Backend request
        // ---------------------------------------------

        const requestData = {

            caller_claim: authority,

            claimed_authority: true,

            threatened_arrest: threatenedArrest,

            demanded_money: demandedMoney,

            asked_otp_bank: askedOtpBank,

            forced_video_call: forcedVideoCall,

            asked_install_app: askedInstallApp,

            created_urgency: createdUrgency

        };


        console.log(
            "Sending data to backend:",
            requestData
        );


        // ---------------------------------------------
        // Loading
        // ---------------------------------------------

        resultBox.style.display = "block";

        resultBox.innerHTML = `

            <h3>⏳ Analyzing Interaction...</h3>

            <p>
                Digital Arrest Shield is checking
                the suspicious interaction.
            </p>

        `;


        try {

            // -----------------------------------------
            // API CALL
            // -----------------------------------------

            const response = await fetch(
                `${BACKEND_URL}/detect-scam`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(requestData)
                }
            );


            const data =
                await response.json();


            // -----------------------------------------
            // Backend error
            // -----------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Backend request failed"
                );

            }


            console.log(
                "Backend response:",
                data
            );


            // -----------------------------------------
            // Red flags
            // -----------------------------------------

            const flags =
                data.red_flags || [];


            let flagsHTML =
                "<p>No specific red flags detected.</p>";


            if (flags.length > 0) {

                flagsHTML = `

                    <ul>

                        ${flags.map(function (flag) {

                            return `
                                <li>
                                    ⚠️ ${escapeHTML(flag)}
                                </li>
                            `;

                        }).join("")}

                    </ul>

                `;

            }


            // -----------------------------------------
            // Safety actions
            // -----------------------------------------

            const actions =
                data.safety_actions || [];


            let actionsHTML =
                "<p>Continue to verify independently.</p>";


            if (actions.length > 0) {

                actionsHTML = `

                    <ul>

                        ${actions.map(function (action) {

                            return `
                                <li>
                                    🛡️ ${escapeHTML(action)}
                                </li>
                            `;

                        }).join("")}

                    </ul>

                `;

            }


            // -----------------------------------------
            // Risk emoji
            // -----------------------------------------

            let riskEmoji = "🛡️";


            if (data.risk_level === "HIGH") {
                riskEmoji = "🚨";
            }

            else if (data.risk_level === "MEDIUM") {
                riskEmoji = "⚠️";
            }


            // -----------------------------------------
            // Final result
            // -----------------------------------------

            resultBox.innerHTML = `

                <h3>
                    ${riskEmoji}
                    ${escapeHTML(data.risk_level)}
                    RISK
                </h3>

                <div class="score">

                    ${escapeHTML(data.risk_score)}/100

                </div>


                <p>

                    Scam detected:

                    <strong>
                        ${data.scam_detected
                            ? "Yes"
                            : "No"}
                    </strong>

                </p>


                <p>

                    Interaction type:

                    <strong>
                        ${escapeHTML(interactionType)}
                    </strong>

                </p>


                <p>

                    Report ID:

                    <strong>
                        ${escapeHTML(data.report_id)}
                    </strong>

                </p>


                <hr>


                <h4>
                    🚩 Red Flags Detected
                </h4>

                ${flagsHTML}


                <hr>


                <h4>
                    🛡️ Recommended Safety Actions
                </h4>

                ${actionsHTML}

            `;

        }


        catch (error) {

            console.error(
                "Backend connection error:",
                error
            );


            resultBox.style.display = "block";


            resultBox.innerHTML = `

                <h3>
                    ❌ Backend Connection Failed
                </h3>

                <p>
                    The frontend could not connect
                    to the FastAPI backend.
                </p>

                <p>
                    Make sure Uvicorn is running at:
                </p>

                <strong>
                    http://127.0.0.1:8000
                </strong>

                <p>
                    <strong>Error:</strong>
                    ${escapeHTML(error.message)}
                </p>

            `;

        }

    });

}


// =====================================================
// VIDEO CALL SIMULATOR
// =====================================================

const simulatorConversation =
    document.querySelector("#sim-conversation");

const simulatorResult =
    document.querySelector("#sim-result");

const acceptCallButton =
    document.querySelector("#acceptCallBtn");

const endCallButton =
    document.querySelector("#endCallBtn");

const callTimer =
    document.querySelector("#callTimer");


let callSeconds = 0;
let callInterval = null;


// =====================================================
// ACCEPT CALL
// =====================================================

if (acceptCallButton) {

    acceptCallButton.addEventListener(
        "click",
        function () {

            acceptCallButton.disabled = true;

            startCallTimer();


            addSimulatorMessage(
                "You accepted the simulated video call."
            );


            simulatorResult.style.display =
                "block";


            simulatorResult.innerHTML = `

                <h3>
                    📹 Video Call Connected
                </h3>

                <p>
                    This is an awareness simulation.
                    Watch for pressure tactics and
                    suspicious requests.
                </p>

            `;

        }
    );

}


// =====================================================
// END CALL
// =====================================================

if (endCallButton) {

    endCallButton.addEventListener(
        "click",
        function () {

            stopCallTimer();


            addSimulatorMessage(
                "You ended the suspicious video call."
            );


            showSafeSimulatorResult();

        }
    );

}


// =====================================================
// CALL TIMER
// =====================================================

function startCallTimer() {

    callSeconds = 0;

    clearInterval(callInterval);


    callInterval =
        setInterval(function () {

            callSeconds++;


            const minutes =
                Math.floor(callSeconds / 60);

            const seconds =
                callSeconds % 60;


            if (callTimer) {

                callTimer.textContent =
                    String(minutes).padStart(2, "0")
                    + ":"
                    + String(seconds).padStart(2, "0");

            }

        }, 1000);

}


function stopCallTimer() {

    clearInterval(callInterval);

}


// =====================================================
// SIMULATOR STEPS
// =====================================================

const simulatorSteps = {

    start: {

        message:
            "I am calling from the Cyber Crime Department. " +
            "Your Aadhaar has been linked to a serious criminal case.",

        options: [

            {
                text: "Continue the call",
                action: "continue"
            },

            {
                text: "Ask for official verification",
                action: "verify"
            },

            {
                text: "End the call",
                action: "end"
            }

        ]

    },


    continue: {

        message:
            "Do not disconnect this call. " +
            "Your case is being handled right now. " +
            "You must cooperate immediately.",

        options: [

            {
                text: "Continue listening",
                action: "continue2"
            },

            {
                text: "Ask for official verification",
                action: "verify"
            },

            {
                text: "End the call",
                action: "end"
            }

        ]

    },


    continue2: {

        message:
            "To verify your identity, provide your bank " +
            "account details and OTP. This is required " +
            "to close the case.",

        options: [

            {
                text: "Share the requested information",
                action: "danger"
            },

            {
                text: "Refuse and verify independently",
                action: "verify"
            },

            {
                text: "End the call",
                action: "end"
            }

        ]

    }

};


// =====================================================
// HANDLE SIMULATOR CHOICE
// =====================================================

function handleChoice(choice) {

    if (!simulatorConversation) {
        return;
    }


    if (choice === "continue") {

        addSimulatorMessage(
            "You chose to continue the call."
        );

        showSimulatorStep("continue");

        return;
    }


    if (choice === "verify") {

        addSimulatorMessage(
            "You asked for official verification."
        );


        stopCallTimer();


        simulatorResult.style.display =
            "block";


        simulatorResult.innerHTML = `

            <h3>
                🛡️ Safer Response
            </h3>

            <p>
                Verify the caller independently
                instead of relying on the caller's
                own contact information.
            </p>

            <p>
                <strong>
                    Key lesson:
                </strong>

                Pressure should never replace verification.
            </p>

        `;


        disableSimulatorOptions();

        return;
    }


    if (choice === "end") {

        addSimulatorMessage(
            "You chose to end the suspicious call."
        );


        showSafeSimulatorResult();

        return;
    }


    if (choice === "continue2") {

        addSimulatorMessage(
            "You continued listening to the caller."
        );


        showSimulatorStep("continue2");

        return;
    }


    if (choice === "danger") {

        addSimulatorMessage(
            "You chose to share the requested information."
        );


        stopCallTimer();


        simulatorResult.style.display =
            "block";


        simulatorResult.innerHTML = `

            <h3>
                🚨 High-Risk Response
            </h3>

            <p>
                Never share OTPs, passwords or
                banking credentials because
                someone demands them on a call.
            </p>

            <p>
                <strong>
                    Safer approach:
                </strong>

                End the interaction and verify
                independently.
            </p>

        `;


        disableSimulatorOptions();

    }

}


// =====================================================
// SHOW SIMULATOR STEP
// =====================================================

function showSimulatorStep(stepName) {

    const step =
        simulatorSteps[stepName];


    if (!step) {
        return;
    }


    const optionsBox =
        document.querySelector("#sim-options");


    if (!optionsBox) {
        return;
    }


    const messageBox =
        document.createElement("div");


    messageBox.className =
        "sim-message caller-message";


    messageBox.innerHTML = `

        <span class="sim-speaker">
            Caller
        </span>

        <p>
            ${escapeHTML(step.message)}
        </p>

    `;


    simulatorConversation.appendChild(
        messageBox
    );


    optionsBox.innerHTML = "";


    step.options.forEach(function (option) {

        const button =
            document.createElement("button");


        button.className =
            "sim-choice";


        button.type =
            "button";


        button.textContent =
            option.text;


        button.addEventListener(
            "click",
            function () {

                handleChoice(
                    option.action
                );

            }
        );


        optionsBox.appendChild(
            button
        );

    });

}


// =====================================================
// ADD SIMULATOR MESSAGE
// =====================================================

function addSimulatorMessage(text) {

    if (!simulatorConversation) {
        return;
    }


    const messageBox =
        document.createElement("div");


    messageBox.className =
        "sim-message user-message";


    messageBox.innerHTML = `

        <span class="sim-speaker">
            You
        </span>

        <p>
            ${escapeHTML(text)}
        </p>

    `;


    simulatorConversation.appendChild(
        messageBox
    );

}


// =====================================================
// SAFE SIMULATOR RESULT
// =====================================================

function showSafeSimulatorResult() {

    stopCallTimer();


    if (!simulatorResult) {
        return;
    }


    simulatorResult.style.display =
        "block";


    simulatorResult.innerHTML = `

        <h3>
            ✅ Safer Response
        </h3>

        <p>
            Ending a suspicious interaction
            prevents continued pressure.
        </p>

        <p>
            <strong>
                Next step:
            </strong>

            Verify the claim using an
            independently found official channel.
        </p>

    `;


    disableSimulatorOptions();

}


// =====================================================
// DISABLE SIMULATOR OPTIONS
// =====================================================

function disableSimulatorOptions() {

    const buttons =
        document.querySelectorAll(
            "#sim-options .sim-choice"
        );


    buttons.forEach(function (button) {

        button.disabled = true;

        button.style.opacity = "0.6";

    });

}


// =====================================================
// RESTART SIMULATOR
// =====================================================

function restartSimulator() {

    stopCallTimer();


    callSeconds = 0;


    if (callTimer) {
        callTimer.textContent = "00:00";
    }


    if (acceptCallButton) {

        acceptCallButton.disabled =
            false;

    }


    if (simulatorConversation) {

        simulatorConversation.innerHTML = `

            <div class="sim-message caller-message">

                <span class="sim-speaker">
                    Caller
                </span>

                <p>
                    I am calling from the Cyber Crime Department.
                    Your Aadhaar has been linked to a serious
                    criminal case.
                </p>

            </div>

        `;

    }


    const optionsBox =
        document.querySelector("#sim-options");


    if (optionsBox) {

        optionsBox.innerHTML = `

            <button
                class="sim-choice"
                onclick="handleChoice('continue')"
                type="button">

                Continue the call

            </button>


            <button
                class="sim-choice"
                onclick="handleChoice('verify')"
                type="button">

                Ask for official verification

            </button>


            <button
                class="sim-choice"
                onclick="handleChoice('end')"
                type="button">

                End the call

            </button>

        `;

    }


    if (simulatorResult) {

        simulatorResult.style.display =
            "none";

        simulatorResult.innerHTML =
            "";

    }

}


// =====================================================
// MESSAGE ANALYZER
// =====================================================

const analyzeMessageButton =
    document.querySelector("#analyzeMessageBtn");

const messageInput =
    document.querySelector("#messageInput");

const messageResult =
    document.querySelector("#messageResult");


if (analyzeMessageButton) {

    analyzeMessageButton.addEventListener(
        "click",
        async function () {

            const message =
                messageInput.value.trim();


            if (!message) {

                messageResult.style.display =
                    "block";


                messageResult.innerHTML = `

                    <h3>
                        ⚠️ Enter a message
                    </h3>

                    <p>
                        Paste the suspicious WhatsApp,
                        SMS or email message first.
                    </p>

                `;

                return;
            }


            const text =
                message.toLowerCase();


            // -----------------------------------------
            // Detect indicators from message
            // -----------------------------------------

            const authorityWords = [
                "cbi",
                "police",
                "cyber crime",
                "rbi",
                "court",
                "customs",
                "government officer"
            ];


            const arrestWords = [
                "arrest",
                "arrested",
                "jail",
                "warrant",
                "criminal case"
            ];


            const moneyWords = [
                "transfer money",
                "send money",
                "payment",
                "fine",
                "penalty",
                "pay now"
            ];


            const sensitiveWords = [
                "otp",
                "bank details",
                "account number",
                "cvv",
                "password",
                "upi pin"
            ];


            const urgencyWords = [
                "immediately",
                "urgent",
                "right now",
                "within 10 minutes",
                "do not disconnect"
            ];


            const videoWords = [
                "video call",
                "stay on call",
                "join video"
            ];


            const appWords = [
                "download app",
                "install app",
                "install application"
            ];


            function containsAny(words) {

                return words.some(function (word) {

                    return text.includes(word);

                });

            }


            const claimedAuthority =
                containsAny(authorityWords);


            const threatenedArrest =
                containsAny(arrestWords);


            const demandedMoney =
                containsAny(moneyWords);


            const askedOtpBank =
                containsAny(sensitiveWords);


            const forcedVideoCall =
                containsAny(videoWords);


            const createdUrgency =
                containsAny(urgencyWords);


            const askedInstallApp =
                containsAny(appWords);


            let callerClaim =
                "Suspicious message";


            if (text.includes("cbi")) {
                callerClaim = "CBI Officer";
            }

            else if (text.includes("police")) {
                callerClaim = "Police Officer";
            }

            else if (text.includes("rbi")) {
                callerClaim = "RBI Official";
            }

            else if (text.includes("court")) {
                callerClaim = "Court Official";
            }


            // -----------------------------------------
            // Send message result to backend
            // -----------------------------------------

            const requestData = {

                caller_claim: callerClaim,

                claimed_authority:
                    claimedAuthority,

                threatened_arrest:
                    threatenedArrest,

                demanded_money:
                    demandedMoney,

                asked_otp_bank:
                    askedOtpBank,

                forced_video_call:
                    forcedVideoCall,

                asked_install_app:
                    askedInstallApp,

                created_urgency:
                    createdUrgency

            };


            messageResult.style.display =
                "block";


            messageResult.innerHTML = `

                <h3>
                    ⏳ Analyzing Message...
                </h3>

                <p>
                    Sending the detected indicators
                    to the FastAPI backend.
                </p>

            `;


            try {

                const response =
                    await fetch(
                        `${BACKEND_URL}/detect-scam`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestData
                                )
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Backend request failed"
                    );

                }


                const flags =
                    data.red_flags || [];


                const actions =
                    data.safety_actions || [];


                messageResult.innerHTML = `

                    <h3>

                        ${
                            data.risk_level === "HIGH"
                                ? "🚨"
                                : data.risk_level === "MEDIUM"
                                    ? "⚠️"
                                    : "🛡️"
                        }

                        ${escapeHTML(data.risk_level)}
                        RISK

                    </h3>


                    <div class="score">

                        ${escapeHTML(data.risk_score)}/100

                    </div>


                    <p>

                        Scam detected:

                        <strong>
                            ${data.scam_detected
                                ? "Yes"
                                : "No"}
                        </strong>

                    </p>


                    <p>

                        Report ID:

                        <strong>
                            ${escapeHTML(data.report_id)}
                        </strong>

                    </p>


                    <hr>


                    <h4>
                        🚩 Red Flags
                    </h4>


                    ${
                        flags.length
                            ? `
                                <ul>
                                    ${flags.map(function(flag) {
                                        return `
                                            <li>
                                                ⚠️
                                                ${escapeHTML(flag)}
                                            </li>
                                        `;
                                    }).join("")}
                                </ul>
                            `
                            : "<p>No specific red flags detected.</p>"
                    }


                    <hr>


                    <h4>
                        🛡️ Safety Actions
                    </h4>


                    <ul>

                        ${actions.map(function(action) {

                            return `
                                <li>
                                    ${escapeHTML(action)}
                                </li>
                            `;

                        }).join("")}

                    </ul>

                `;

            }


            catch (error) {

                console.error(
                    "Message analysis error:",
                    error
                );


                messageResult.innerHTML = `

                    <h3>
                        ❌ Backend Connection Failed
                    </h3>

                    <p>
                        ${escapeHTML(error.message)}
                    </p>

                `;

            }

        }
    );

}


// =====================================================
// SCREENSHOT ANALYZER
// =====================================================

const screenshotInput =
    document.querySelector("#screenshotInput");

const analyzeScreenshotButton =
    document.querySelector("#analyzeScreenshotBtn");

const screenshotResult =
    document.querySelector("#screenshotResult");


if (analyzeScreenshotButton) {

    analyzeScreenshotButton.addEventListener(
        "click",
        function () {

            if (
                !screenshotInput ||
                !screenshotInput.files.length
            ) {

                screenshotResult.style.display =
                    "block";


                screenshotResult.innerHTML = `

                    <h3>
                        ⚠️ Select a screenshot
                    </h3>

                    <p>
                        Please upload a screenshot first.
                    </p>

                `;

                return;
            }


            const file =
                screenshotInput.files[0];


            screenshotResult.style.display =
                "block";


            screenshotResult.innerHTML = `

                <h3>
                    📷 Screenshot Selected
                </h3>

                <p>

                    File:

                    <strong>
                        ${escapeHTML(file.name)}
                    </strong>

                </p>


                <p>
                    Screenshot upload is ready.
                </p>


                <p>
                    <strong>
                        Next upgrade:
                    </strong>

                    OCR will extract text from the
                    screenshot and send those indicators
                    to the FastAPI detection engine.
                </p>

            `;

        }
    );

}