/* =========================================================
   VOICE ANALYZER
   1) Microphone  -> browser speech recognition (Chrome) -> text
   2) Voice note  -> converted to WAV in the browser -> backend /voice-upload (Gemini) -> text
   3) Text        -> backend /voice-detect               -> risk result
   The result is shown with renderRiskResult() from script.js,
   so it also gets the AI Safety Advisor box.
   ========================================================= */

(function () {

    const micBtn      = document.getElementById("voiceMicBtn");
    const stopBtn     = document.getElementById("voiceStopBtn");
    const fileInput   = document.getElementById("voiceFileInput");
    const langSelect  = document.getElementById("voiceLangSelect");
    const transcript  = document.getElementById("voiceTranscript");
    const analyzeBtn  = document.getElementById("analyzeVoiceBtn");
    const statusBox   = document.getElementById("voiceStatus");
    const resultBox   = document.getElementById("voiceResult");

    if (!micBtn || !analyzeBtn || !resultBox) {
        console.error("VOICE ANALYZER ELEMENT MISSING");
        return;
    }

    // small styles for this section
    const style = document.createElement("style");
    style.textContent = `
        .voice-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px;}
        .voice-btn{padding:12px 18px;border:1px solid #2dd4bf;border-radius:10px;
            background:transparent;color:#2dd4bf;font-weight:700;cursor:pointer;font-size:14px;}
        .voice-btn:hover:not(:disabled){background:#2dd4bf;color:#031014;}
        .voice-btn:disabled{opacity:.4;cursor:default;}
        .voice-select{width:100%;margin-top:8px;padding:12px;border-radius:10px;
            border:1px solid #28465e;background:#0b2032;color:white;font-size:14px;}
        .voice-status{min-height:22px;margin-top:14px;color:#f5c451;font-size:14px;}
        .voice-note{margin-top:14px;font-size:13px;color:#8da2b8;}
        .voice-label{display:block;margin-top:18px;font-size:14px;color:#aebdcd;}
    `;
    document.head.appendChild(style);

    // ---------- language list for the mic (same 12 languages) ----------
    LANGS.forEach(function (l) { langSelect.add(new Option(l[1], l[2])); });
    langSelect.value = window.getSpeechCode(window.getSiteLang());

    function setStatus(text) { statusBox.textContent = text; }

    // ---------- 1) microphone ----------
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognizer = null;
    let baseText = "";

    micBtn.addEventListener("click", function () {
        if (!SpeechRec) {
            setStatus("Microphone speech recognition works only in Chrome / Edge. You can upload a voice note instead.");
            return;
        }
        recognizer = new SpeechRec();
        recognizer.lang = langSelect.value;
        recognizer.continuous = true;
        recognizer.interimResults = true;
        baseText = transcript.value.trim() ? transcript.value.trim() + " " : "";

        recognizer.onresult = function (e) {
            let text = "";
            for (let i = 0; i < e.results.length; i++) {
                text += e.results[i][0].transcript + " ";
            }
            transcript.value = baseText + text.trim();
        };
        recognizer.onerror = function (e) {
            setStatus("Microphone error: " + e.error + ". Allow microphone permission and try again.");
        };
        recognizer.onend = function () {
            micBtn.disabled = false;
            stopBtn.disabled = true;
        };

        recognizer.start();
        micBtn.disabled = true;
        stopBtn.disabled = false;
        setStatus("Listening... speak now");
    });

    stopBtn.addEventListener("click", function () {
        if (recognizer) { recognizer.stop(); }
        setStatus("");
    });

    // ---------- helper: call backend ----------
    async function callBackend(path, options) {
        let response;
        try {
            response = await fetch(BACKEND_URL + path, options);
        } catch (err) {
            throw new Error("Backend se connection nahi ho pa raha. FastAPI running hai ya nahi check karo.");
        }
        let data = {};
        try { data = await response.json(); } catch (err) { /* ignore */ }
        if (!response.ok) {
            throw new Error(data.detail || ("Backend Error " + response.status));
        }
        return data;
    }

    function showError(message) {
        showBox(resultBox,
            '<div class="risk-medium"><h3>⚠️ Voice Analysis Failed</h3><p>' +
            escapeHTML(message) + "</p></div>");
    }

    // ---------- convert any voice note (ogg / opus / mp3 / m4a ...) to 16 kHz mono WAV ----------
    function writeString(view, offset, text) {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    }

    function encodeWav(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, "WAVE");
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);              // PCM header size
        view.setUint16(20, 1, true);               // PCM format
        view.setUint16(22, 1, true);               // mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);  // byte rate
        view.setUint16(32, 2, true);               // block align
        view.setUint16(34, 16, true);              // 16 bit
        writeString(view, 36, "data");
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        return new Blob([buffer], { type: "audio/wav" });
    }

    async function fileToWav(file) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx || !window.OfflineAudioContext) {
            throw new Error("Browser cannot convert audio");
        }

        const arrayBuffer = await file.arrayBuffer();
        const ctx = new AudioCtx();
        let decoded;
        try {
            decoded = await ctx.decodeAudioData(arrayBuffer);
        } finally {
            ctx.close();
        }

        const rate = 16000;
        const length = Math.max(1, Math.ceil(decoded.duration * rate));
        const offline = new OfflineAudioContext(1, length, rate);   // mono, 16 kHz
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();

        const rendered = await offline.startRendering();
        return encodeWav(rendered.getChannelData(0), rate);
    }

    // ---------- 2) voice note upload ----------
    fileInput.addEventListener("change", async function () {
        const file = fileInput.files[0];
        if (!file) { return; }

        setStatus("Preparing the voice note...");
        showBox(resultBox, "<h3>🔍 Analyzing Voice Note...</h3><p>Please wait...</p>");

        const form = new FormData();

        try {
            const wav = await fileToWav(file);
            if (wav.size > 9.5 * 1024 * 1024) {
                throw new Error("WAV too large, using original file");
            }
            form.append("file", wav, "voice.wav");
            console.log("Voice note converted to WAV:", wav.size, "bytes");
        } catch (err) {
            console.warn("WAV conversion skipped:", err);
            form.append("file", file);          // send the original file instead
        }

        setStatus("Reading the voice note... this can take some seconds");

        try {
            const data = await callBackend("/voice-upload", { method: "POST", body: form });
            transcript.value = data.transcript || "";
            setStatus("");
            renderRiskResult(resultBox, data, data.transcript || "");
        } catch (err) {
            setStatus("");
            showError(err.message);
        }
        fileInput.value = "";
    });

    // ---------- 3) analyze the text in the box ----------
    analyzeBtn.addEventListener("click", async function () {
        const text = transcript.value.trim();
        if (!text) {
            showBox(resultBox,
                '<div class="risk-medium"><h3>⚠️ Voice Required</h3>' +
                "<p>Pehle bolo, voice note upload karo ya text paste karo.</p></div>");
            return;
        }

        setStatus("");
        showBox(resultBox, "<h3>🔍 Analyzing...</h3><p>Please wait...</p>");

        try {
            const data = await callBackend("/voice-detect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: text })
            });
            renderRiskResult(resultBox, data, text);
        } catch (err) {
            showError(err.message);
        }
    });

})();