/* =========================================================
   LANGUAGE SELECTOR (added feature)
   12 languages. Uses the free Google Translate engine, so the
   WHOLE page (including results and AI advice) gets translated.
   Your existing code is not changed.

   To add/remove a language: edit the LANGS list below.
   [code, name shown in dropdown, speech-recognition code]
   ========================================================= */

const LANGS = [
    ["en", "English",    "en-IN"],
    ["hi", "हिन्दी",      "hi-IN"],
    ["bn", "বাংলা",       "bn-IN"],
    ["mr", "मराठी",      "mr-IN"],
    ["te", "తెలుగు",      "te-IN"],
    ["ta", "தமிழ்",       "ta-IN"],
    ["gu", "ગુજરાતી",     "gu-IN"],
    ["ur", "اردو",       "ur-IN"],
    ["kn", "ಕನ್ನಡ",       "kn-IN"],
    ["ml", "മലയാളം",     "ml-IN"],
    ["pa", "ਪੰਜਾਬੀ",      "pa-guru-IN"],
    ["or", "ଓଡ଼ିଆ",       "or-IN"]
];

(function () {

    // ---------- current language is stored in the googtrans cookie ----------
    function getSiteLang() {
        const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([^;]+)/);
        return m ? decodeURIComponent(m[1]) : "en";
    }

    function setCookie(value, expired) {
        const exp = expired ? "; expires=Thu, 01 Jan 1970 00:00:00 GMT" : "";
        document.cookie = "googtrans=" + value + "; path=/" + exp;
        if (location.hostname.indexOf(".") > -1 && !/^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) {
            document.cookie = "googtrans=" + value + "; path=/; domain=." + location.hostname + exp;
        }
    }

    function changeLanguage(code) {
        if (code === "en") {
            setCookie("/en/en", true);
        } else {
            setCookie("/en/" + code, false);
        }
        location.reload();            // page reloads already translated
    }

    // used by voice.js
    window.getSiteLang = getSiteLang;
    window.getSpeechCode = function (code) {
        const item = LANGS.find(l => l[0] === code);
        return item ? item[2] : "en-IN";
    };

    const current = getSiteLang();

    // ---------- styles (hide Google's banner, style our dropdown) ----------
    const style = document.createElement("style");
    style.textContent = `
        .lang-select{padding:9px 12px;border:1px solid #2dd4bf;border-radius:8px;
            background:#07111f;color:#2dd4bf;font-size:14px;cursor:pointer;margin-left:15px;}
        body{top:0 !important;}
        .skiptranslate iframe, .goog-te-banner-frame, .goog-logo-link,
        .goog-te-gadget span, #goog-gt-tt, .goog-te-balloon-frame,
        .VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none !important;}
        .goog-te-gadget{font-size:0 !important;}
        font{background:none !important;box-shadow:none !important;}
    `;
    document.head.appendChild(style);

    // ---------- dropdown in the navbar ----------
    const select = document.createElement("select");
    select.id = "langSelect";
    select.className = "lang-select notranslate";
    select.setAttribute("translate", "no");
    select.setAttribute("aria-label", "Language");
    LANGS.forEach(function (l) { select.add(new Option(l[1], l[0])); });
    select.value = LANGS.some(l => l[0] === current) ? current : "en";
    select.addEventListener("change", function () { changeLanguage(select.value); });

    const navbar = document.querySelector(".navbar");
    (navbar || document.body).appendChild(select);

    // ---------- add "Voice Check" link to the navbar menu ----------
    const nav = document.querySelector(".navbar nav");
    if (nav && !nav.querySelector('a[href="#voice"]')) {
        const a = document.createElement("a");
        a.href = "#voice";
        a.textContent = "Voice Check";
        const analyzer = nav.querySelector('a[href="#tools"]');
        if (analyzer && analyzer.nextSibling) {
            nav.insertBefore(a, analyzer.nextSibling);
        } else {
            nav.appendChild(a);
        }
    }

    // ---------- load Google Translate only when a language is chosen ----------
    if (current !== "en") {
        const holder = document.createElement("div");
        holder.id = "google_translate_element";
        holder.style.display = "none";
        document.body.appendChild(holder);

        window.googleTranslateElementInit = function () {
            new google.translate.TranslateElement({
                pageLanguage: "en",
                includedLanguages: LANGS.filter(l => l[0] !== "en").map(l => l[0]).join(","),
                autoDisplay: false
            }, "google_translate_element");
        };

        const s = document.createElement("script");
        s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        document.body.appendChild(s);
    }

})();
