"""Scam signal detector for voice / text (Hindi + English + Hinglish).

detect_signals(text) -> dict whose keys match ScamInput
(everything except caller_claim, which voice_routes.py adds itself).
"""
import re

PATTERNS = {
    "claimed_authority": [
        r"\bpolice\b", r"\bpulis\b", r"पुलिस", r"\bcbi\b", r"सीबीआई", r"\bncb\b",
        r"\bcid\b", r"\bnia\b", r"\brbi\b", r"आरबीआई", r"\bcourt\b", r"कोर्ट",
        r"अदालत", r"\bofficer\b", r"\bofficar\b", r"ऑफिसर", r"ऑफ़िसर", r"अधिकारी",
        r"cyber\s*crime", r"साइबर", r"\bcustoms?\b", r"कस्टम", r"income\s*tax",
        r"इनकम\s*टैक्स", r"\bed\b", r"enforcement\s+directorate", r"\btrai\b",
        r"ट्राई", r"narcotics", r"\bgovernment\b", r"\bsarkar\b", r"सरकार",
        r"inspector", r"इंस्पेक्टर", r"crime\s*branch", r"\bsebi\b", r"\bdepartment\b",
        r"विभाग", r"\bmagistrate\b", r"\bjudge\b", r"\bsipahi\b",
    ],
    # arrest / legal threat / threat of harm / kidnapping
    "threatened_arrest": [
        r"\barrest(ed|ing)?\b", r"गिरफ्तार", r"गिरफ़्तार", r"\bgiraftar\w*", r"\bjail\b",
        r"जेल", r"\bcustody\b", r"हिरासत", r"\bwarrant\b", r"वारंट", r"\bfir\b",
        r"एफआईआर", r"\bcase\b", r"केस", r"legal\s+action", r"कानूनी\s+कार्र?वाई",
        r"फंस", r"फँस", r"\bfa(s|ss|ns)\w*", r"\bfss\w*", r"money\s+laundering",
        r"मनी\s+लॉन्ड्रिंग", r"\bparcel\b", r"पार्सल", r"\bdrugs?\b", r"ड्रग",
        r"सज़ा", r"सजा", r"\bpunish", r"\bcriminal\b", r"अपराध",
        # harm / kidnap threats
        r"\bkidnap\w*", r"किडनैप", r"अपहरण", r"\bransom\b", r"फिरौती",
        r"\bkill\b", r"\bmurder", r"\bma+r+\s+d\w*",
        r"मार\s*(दूँगा|दूंगा|डालूँगा|डालूंगा|दूँगी|दूंगी|दो|डालेंगे)",
        r"जान\s*से", r"\bjaan\s+se\b", r"\bdhamki\b", r"धमकी", r"\bthreat\w*",
    ],
    "demanded_money": [
        r"\btransfer\w*", r"ट्रांसफर", r"\bpay(ment|ments)?\b", r"पेमेंट", r"भुगतान",
        r"\bfine\b", r"जुर्माना", r"\brupee\w*", r"\brupay\w*", r"\brs\b", r"रुपये",
        r"रुपए", r"रूपये", r"रुपया", r"\blakh\w*", r"लाख", r"\bcrore\b", r"करोड़",
        r"\bhaz(a)?ar\b", r"हज़ार", r"हजार", r"₹", r"\brs\.?\s*\d", r"\bupi\b",
        r"\bdeposit\b", r"जमा", r"\bpaise\b", r"\bpaisa\b", r"\bpaisay\b", r"पैसे",
        r"पैसा", r"\bamount\b", r"राशि", r"settlement", r"\bsend\s+money\b",
        r"\bbhej(o|na|do|ni)\b", r"भेज", r"\bbail\b", r"जमानत", r"\bransom\b", r"फिरौती",
    ],
    "asked_otp_bank": [
        r"\botp\b", r"ओटीपी", r"\bpin\b", r"पिन", r"password", r"पासवर्ड", r"\bcvv\b",
        r"bank\s+(details|account|detail)", r"बैंक", r"\bbank\b", r"अकाउंट\s*नंबर",
        r"account\s+number", r"खाता", r"\bcard\b", r"कार्ड", r"aadhaar", r"aadhar",
        r"आधार", r"\bpan\b", r"पैन\s*कार्ड", r"net\s*banking", r"नेट\s*बैंकिंग",
    ],
    "forced_video_call": [
        r"video\s*call", r"वीडियो\s*कॉल", r"\bvideo\b", r"वीडियो", r"\bskype\b",
        r"\bzoom\b", r"\bcamera\b", r"कैमरा", r"stay\s+on\s+(the\s+)?(call|line)",
        r"do\s*n'?o?t\s+disconnect", r"कॉल\s+(मत|ना)\s+(काट|रख)", r"फोन\s+(मत|ना)\s+रख",
        r"डिस्कनेक्ट", r"कॉल\s+पर\s+बने", r"digital\s+arrest", r"डिजिटल\s+अरेस्ट",
        r"call\s+(mat|na)\s+(kat|rakh)\w*",
    ],
    "asked_install_app": [
        r"\binstall\w*", r"इंस्टॉल", r"\bdownload\w*", r"डाउनलोड", r"\bapk\b",
        r"anydesk", r"teamviewer", r"quick\s*support", r"remote\s+access",
        r"\bapp\b", r"\bapplication\b", r"एप्लिकेशन", r"\bएप\b", r"\bऐप\b",
    ],
    "created_urgency": [
        r"\burgent(ly)?\b", r"\bimmediately\b", r"right\s+now", r"\basap\b",
        r"within\s+\d+\s*(hour|hours|minute|minutes|min)", r"\babhi\b", r"अभी",
        r"तुरंत", r"\bturant\b", r"जल्दी", r"\bjaldi\b", r"फौरन", r"फ़ौरन",
        r"आज\s+ही", r"जल्द\s+से\s+जल्द", r"last\s+chance", r"वरना", r"\bvrna\b",
        r"\bwarna\b", r"\botherwise\b", r"किसी\s+को\s+(मत|नहीं)\s+बता",
        r"kisi\s+ko\s+(mat|nahi|nhi)\s+bata\w*", r"do\s*n'?o?t\s+tell\s+anyone",
        r"\bsecret\b", r"गोपनीय", r"confidential", r"\bdeadline\b",
    ],
}

# "your family member is in trouble" = a family word AND a trouble word together
FAMILY_WORDS = [
    r"\bson\b", r"\bdaughter\b", r"\bchild\b", r"\bchildren\b", r"\bkid\b", r"\bbrother\b",
    r"\bsister\b", r"\bfather\b", r"\bmother\b", r"\bhusband\b", r"\bwife\b",
    r"\brelative\b", r"\bfamily\b", r"\bpapa\b", r"\bmummy\b", r"\bmaa\b",
    r"\bbach(ch)?[ae]\b", r"\bbachcha\b", r"\bbeta\b", r"\bbeti\b", r"\bbhai\b",
    r"\bbeh(e)?n\b", r"\bbahan\b", r"\bpati\b", r"\bpatni\b", r"\bghar\s+(ka|ke|ki)\b",
    r"\bparivar\b", r"\bpariwar\b", r"पापा", r"मम्मी", r"माँ", r"बेटा", r"बेटी",
    r"बच्चा", r"बच्चे", r"भाई", r"बहन", r"परिवार", r"घर\s+(का|के|की)", r"पति",
    r"पत्नी", r"रिश्तेदार",
]
TROUBLE_WORDS = [
    r"\baccident\w*", r"\bhospital\b", r"\bkidnap\w*", r"\bransom\b", r"\bpakda\b",
    r"\bpakde\b", r"\bpakad\w*", r"\bfa(s|ss|ns)\w*", r"\bfss\w*", r"\barrest\w*",
    r"police\s+station", r"\binjur\w*", r"\bemergency\b", r"\bcritical\b",
    r"\bma+r+\s+d\w*", r"\bmar\s+gay\w*", r"\bghayal\b", r"\bchot\b",
    r"एक्सीडेंट", r"अस्पताल", r"हॉस्पिटल", r"पकड़", r"फंस", r"फँस", r"गिरफ्तार",
    r"अपहरण", r"किडनैप", r"इमरजेंसी", r"चोट", r"घायल", r"फिरौती",
]

_COMPILED = {k: [re.compile(p, re.IGNORECASE) for p in v] for k, v in PATTERNS.items()}
_FAMILY = [re.compile(p, re.IGNORECASE) for p in FAMILY_WORDS]
_TROUBLE = [re.compile(p, re.IGNORECASE) for p in TROUBLE_WORDS]


def detect_signals(text: str) -> dict:
    text = text or ""
    signals = {
        key: any(rx.search(text) for rx in regexes)
        for key, regexes in _COMPILED.items()
    }
    signals["family_emergency"] = (
        any(rx.search(text) for rx in _FAMILY)
        and any(rx.search(text) for rx in _TROUBLE)
    )
    return signals