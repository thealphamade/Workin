#!/usr/bin/env python3
"""Builds poster.html — International Men's Day poster for The Alpha Made."""
import sys, os
sys.path.insert(0, os.path.expanduser("~/tam"))
from tam_logo import FRAME, HANDLE, WORDS

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_D = FRAME + HANDLE + WORDS

# ---- geometry (canvas 1080 x 1350) -------------------------------------
# Left collar leaf; the right one is the mirror image around x = 540.
COLLAR_L = ("M272,720 C258,760 240,815 222,866 "      # top tip -> outer shoulder
            "C238,940 262,1020 290,1092 "              # outer edge -> collar point
            "C292,1100 300,1101 306,1096 "             # rounded point
            "C352,1052 405,1008 452,968 "              # inner edge up to the knot
            "C460,945 466,925 472,904 "                # along the knot side
            "C420,860 340,782 272,720 Z")              # folded top edge back to tip
# collar top-stitching, ~11px inside the outer and inner edges
STITCH_L = ("M262,742 C248,782 232,830 218,872 C234,944 256,1018 284,1085 "
            "M300,1086 C346,1044 398,1000 444,962")
# the fold along the top of the collar
FOLD_L = "M272,720 C340,782 420,860 472,904"

BODY = ("M-20,972 C70,935 150,898 226,866 L470,936 L610,936 L854,866 "
        "C930,898 1010,935 1100,972 L1100,1370 L-20,1370 Z")

KNOT = ("M430,906 C480,892 600,892 650,906 "
        "C646,968 618,1048 586,1112 "
        "C560,1122 520,1122 494,1112 "
        "C462,1048 434,968 430,906 Z")
BLADE = ("M498,1104 L582,1104 C612,1180 648,1268 676,1370 "
         "L404,1370 C432,1268 468,1180 498,1104 Z")


def mirror(d):
    """Mirror a path made of absolute M/C/L/Z commands around x = 540."""
    out, tok = [], d.replace(",", " ").split()
    i = 0
    while i < len(tok):
        t = tok[i]
        if t[0].isalpha():
            cmd, rest = t[0], t[1:]
            out.append(cmd)
            if rest:
                tok.insert(i + 1, rest)
            i += 1
            continue
        x, y = float(tok[i]), float(tok[i + 1])
        out.append(f"{1080 - x:g},{y:g}")
        i += 2
    return " ".join(out)


COLLAR_R, STITCH_R, FOLD_R = mirror(COLLAR_L), mirror(STITCH_L), mirror(FOLD_L)

HTML = f"""<!doctype html>
<html><head><meta charset="utf-8">
<title>Men's Day Poster</title>
<style>
@font-face {{ font-family: Mont; font-weight: 500; src: url(montserrat-500.woff2) format("woff2"); }}
@font-face {{ font-family: Mont; font-weight: 800; src: url(montserrat-800.woff2) format("woff2"); }}
html, body {{ margin: 0; background: #0b0b0b; }}
#poster {{ position: relative; width: 1080px; height: 1350px; overflow: hidden; background: #121212; }}
#poster > * {{ position: absolute; }}
svg.full {{ left: 0; top: 0; width: 1080px; height: 1350px; }}
#logo {{ left: 50%; top: 92px; width: 250px; transform: translateX(-50%); }}
#headline {{
  left: 0; right: 0; top: 336px; margin: 0; text-align: center;
  font: 800 77px/0.96 Mont, sans-serif; color: #FFCE0B; letter-spacing: -0.5px;
  text-shadow: 0 2px 0 rgba(0,0,0,.25);
}}
#note {{
  left: 50%; top: 590px; transform: translateX(-50%); white-space: nowrap;
  padding: 14px 20px 15px; border: 1.6px solid rgba(255,255,255,.55); border-radius: 22px;
  font: 500 21px/1.3 Mont, sans-serif; color: #fff; text-align: center; letter-spacing: -0.2px;
  background: rgba(255,255,255,.015);
}}
</style></head>
<body>
<div id="poster">

<!-- 1. background: black paper with a soft vignette -->
<svg class="full" viewBox="0 0 1080 1350">
  <defs>
    <radialGradient id="vig" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#1d1d1d"/><stop offset=".6" stop-color="#121212"/>
      <stop offset="1" stop-color="#070707"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/>
    </filter>
  </defs>
  <rect width="1080" height="1350" fill="url(#vig)"/>
  <rect width="1080" height="1350" filter="url(#grain)"/>
</svg>

<!-- 2. shirt, collar and tie -->
<svg class="full" viewBox="0 0 1080 1350">
  <defs>
    <!-- shirting: fine vertical weave -->
    <pattern id="weave" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="5" fill="#fff"/>
      <rect x="0" width="1.2" height="5" fill="#000" opacity=".075"/>
      <rect x="2.6" width=".6" height="5" fill="#000" opacity=".03"/>
    </pattern>
    <pattern id="weaveFine" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="3" fill="#fff"/>
      <rect x="0" width=".9" height="3" fill="#000" opacity=".045"/>
    </pattern>
    <filter id="cloth" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4 .25" numOctaves="2" seed="11"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.9 .5"/>
    </filter>
    <!-- silk twill for the tie -->
    <filter id="silk" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6 .12" numOctaves="2" seed="5"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.4 .75"/>
    </filter>
    <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="blur10"><feGaussianBlur stdDeviation="10"/></filter>
    <filter id="blur18"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="blur1"><feGaussianBlur stdDeviation="1.2"/></filter>

    <clipPath id="clipBody"><path d="{BODY}"/></clipPath>
    <clipPath id="clipCL"><path d="{COLLAR_L}"/></clipPath>
    <clipPath id="clipCR"><path d="{COLLAR_R}"/></clipPath>
    <clipPath id="clipKnot"><path d="{KNOT}"/></clipPath>
    <clipPath id="clipBlade"><path d="{BLADE}"/></clipPath>
    <clipPath id="clipTie"><path d="{KNOT}"/><path d="{BLADE}"/></clipPath>

    <!-- body light: brighter centre, falling off to the sides and the shoulders -->
    <linearGradient id="bodyX" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/>
      <stop offset=".22" stop-color="#000" stop-opacity=".03"/>
      <stop offset=".5" stop-color="#000" stop-opacity="0"/>
      <stop offset=".78" stop-color="#000" stop-opacity=".04"/>
      <stop offset="1" stop-color="#000" stop-opacity=".26"/>
    </linearGradient>
    <linearGradient id="bodyY" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".04"/>
    </linearGradient>

    <!-- collar shading -->
    <linearGradient id="collarL" gradientUnits="userSpaceOnUse" x1="230" y1="760" x2="430" y2="1040">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".55" stop-color="#000" stop-opacity=".05"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>
    <linearGradient id="collarR" gradientUnits="userSpaceOnUse" x1="850" y1="760" x2="650" y2="1040">
      <stop offset="0" stop-color="#000" stop-opacity=".02"/>
      <stop offset=".55" stop-color="#000" stop-opacity=".07"/>
      <stop offset="1" stop-color="#000" stop-opacity=".24"/>
    </linearGradient>
    <linearGradient id="collarOutL" gradientUnits="userSpaceOnUse" x1="222" y1="0" x2="300" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="collarOutR" gradientUnits="userSpaceOnUse" x1="858" y1="0" x2="780" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>

    <!-- tie -->
    <linearGradient id="knotBase" gradientUnits="userSpaceOnUse" x1="430" y1="900" x2="650" y2="1110">
      <stop offset="0" stop-color="#3a3a3c"/>
      <stop offset=".35" stop-color="#1e1e20"/>
      <stop offset=".7" stop-color="#121213"/>
      <stop offset="1" stop-color="#070707"/>
    </linearGradient>
    <radialGradient id="knotHi" gradientUnits="userSpaceOnUse" cx="505" cy="955" r="120">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bladeBase" gradientUnits="userSpaceOnUse" x1="410" y1="0" x2="676" y2="0">
      <stop offset="0" stop-color="#0b0b0c"/>
      <stop offset=".22" stop-color="#2a2a2c"/>
      <stop offset=".46" stop-color="#1a1a1b"/>
      <stop offset=".5" stop-color="#0d0d0e"/>
      <stop offset=".56" stop-color="#232325"/>
      <stop offset=".8" stop-color="#151516"/>
      <stop offset="1" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="bladeTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".75"/>
      <stop offset=".16" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- shirt body -->
  <g clip-path="url(#clipBody)">
    <rect x="-20" y="850" width="1120" height="520" fill="url(#weave)"/>
    <rect x="-20" y="850" width="1120" height="520" filter="url(#cloth)" opacity=".14"/>
    <rect x="-20" y="850" width="1120" height="520" fill="url(#bodyX)"/>
    <rect x="-20" y="850" width="1120" height="520" fill="url(#bodyY)"/>
    <!-- soft drape folds -->
    <path d="M60,1000 C120,1120 140,1250 120,1370 L70,1370 C90,1250 80,1120 30,1010Z" fill="#000" opacity=".06" filter="url(#blur18)"/>
    <path d="M1010,990 C960,1110 950,1250 970,1370 L1030,1370 C1010,1250 1010,1120 1050,1000Z" fill="#000" opacity=".07" filter="url(#blur18)"/>
    <path d="M180,1010 C230,1120 250,1240 240,1370" stroke="#fff" stroke-width="26" fill="none" opacity=".5" filter="url(#blur18)"/>
    <path d="M880,1000 C840,1120 830,1240 840,1370" stroke="#fff" stroke-width="22" fill="none" opacity=".35" filter="url(#blur18)"/>
    <!-- placket under the tie -->
    <path d="M470,1120 L470,1370 M610,1120 L610,1370" stroke="#000" stroke-width="2" opacity=".07"/>
    <!-- shadows thrown by the collar and tie -->
    <g transform="translate(14,20)" filter="url(#blur18)" opacity=".42">
      <path d="{COLLAR_L}" fill="#000"/><path d="{COLLAR_R}" fill="#000"/>
      <path d="{KNOT}" fill="#000"/><path d="{BLADE}" fill="#000"/>
    </g>
    <g transform="translate(5,7)" filter="url(#blur6)" opacity=".38">
      <path d="{COLLAR_L}" fill="#000"/><path d="{COLLAR_R}" fill="#000"/>
      <path d="{KNOT}" fill="#000"/><path d="{BLADE}" fill="#000"/>
    </g>
    <!-- shoulder seam shading at the top of the body -->
    <path d="{BODY}" fill="none" stroke="#000" stroke-width="30" opacity=".18" filter="url(#blur10)"/>
  </g>
  <!-- crisp edge of the body against the black -->
  <path d="M-20,972 C70,935 150,898 226,866 M854,866 C930,898 1010,935 1100,972" fill="none" stroke="#fff" stroke-width="1.5" opacity=".7"/>

  <!-- tie: blade -->
  <g clip-path="url(#clipBlade)">
    <rect x="400" y="1100" width="280" height="270" fill="url(#bladeBase)"/>
    <rect x="400" y="1100" width="280" height="270" filter="url(#silk)" opacity=".16" transform="rotate(-38 540 1235)"/>
    <rect x="400" y="1100" width="280" height="270" fill="url(#bladeTop)"/>
    <!-- centre dimple crease -->
    <path d="M540,1112 C536,1180 532,1260 528,1370" stroke="#000" stroke-width="10" opacity=".55" fill="none" filter="url(#blur6)"/>
    <path d="M552,1116 C556,1190 566,1270 576,1370" stroke="#fff" stroke-width="10" opacity=".07" fill="none" filter="url(#blur6)"/>
    <path d="M514,1116 C505,1190 494,1270 484,1370" stroke="#fff" stroke-width="12" opacity=".09" fill="none" filter="url(#blur6)"/>
  </g>
  <path d="{BLADE}" fill="none" stroke="#000" stroke-width="1.5" opacity=".6"/>

  <!-- tie: knot -->
  <g clip-path="url(#clipKnot)">
    <rect x="420" y="880" width="240" height="250" fill="url(#knotBase)"/>
    <rect x="420" y="880" width="240" height="250" filter="url(#silk)" opacity=".18" transform="rotate(32 540 1000)"/>
    <rect x="420" y="880" width="240" height="250" fill="url(#knotHi)"/>
    <!-- the diagonal wrap of a four-in-hand knot -->
    <path d="M640,930 C600,960 540,1010 470,1040" stroke="#000" stroke-width="16" opacity=".55" fill="none" filter="url(#blur6)"/>
    <path d="M650,960 C610,990 560,1030 500,1062" stroke="#fff" stroke-width="10" opacity=".08" fill="none" filter="url(#blur6)"/>
    <path d="M620,912 C590,935 540,972 452,1004" stroke="#fff" stroke-width="6" opacity=".10" fill="none" filter="url(#blur3)"/>
    <!-- pinch at the bottom of the knot -->
    <path d="M520,1060 C528,1085 536,1105 540,1120 C546,1100 556,1082 566,1060" stroke="#000" stroke-width="8" opacity=".6" fill="none" filter="url(#blur3)"/>
    <!-- edge falloff -->
    <path d="{KNOT}" fill="none" stroke="#000" stroke-width="22" opacity=".55" filter="url(#blur10)"/>
    <!-- top rim catching light -->
    <path d="M440,909 C490,897 590,897 640,909" stroke="#fff" stroke-width="3" opacity=".22" fill="none" filter="url(#blur1)"/>
  </g>

  <!-- collar leaves -->
  <g transform="translate(5,9)" filter="url(#blur6)" opacity=".5">
    <path d="{COLLAR_L}" fill="#000"/><path d="{COLLAR_R}" fill="#000"/>
  </g>
  <g clip-path="url(#clipCL)">
    <rect x="200" y="700" width="300" height="420" fill="url(#weaveFine)"/>
    <rect x="200" y="700" width="300" height="420" filter="url(#cloth)" opacity=".10"/>
    <rect x="200" y="700" width="300" height="420" fill="url(#collarL)"/>
    <rect x="200" y="700" width="300" height="420" fill="url(#collarOutL)"/>
    <!-- soft roll just under the fold -->
    <path d="{FOLD_L}" stroke="#000" stroke-width="26" opacity=".10" fill="none" filter="url(#blur10)" transform="translate(-4,16)"/>
    <path d="{FOLD_L}" stroke="#fff" stroke-width="8" opacity=".9" fill="none" filter="url(#blur3)"/>
    <!-- edge darkening near the tie -->
    <path d="M306,1096 C352,1052 405,1008 452,968 C460,945 466,925 472,904" stroke="#000" stroke-width="18" opacity=".16" fill="none" filter="url(#blur6)"/>
    <path d="{STITCH_L}" stroke="#000" stroke-width="1.2" stroke-dasharray="4 3" opacity=".16" fill="none"/>
  </g>
  <g clip-path="url(#clipCR)">
    <rect x="580" y="700" width="300" height="420" fill="url(#weaveFine)"/>
    <rect x="580" y="700" width="300" height="420" filter="url(#cloth)" opacity=".10"/>
    <rect x="580" y="700" width="300" height="420" fill="url(#collarR)"/>
    <rect x="580" y="700" width="300" height="420" fill="url(#collarOutR)"/>
    <path d="{FOLD_R}" stroke="#000" stroke-width="26" opacity=".12" fill="none" filter="url(#blur10)" transform="translate(4,16)"/>
    <path d="{FOLD_R}" stroke="#fff" stroke-width="8" opacity=".75" fill="none" filter="url(#blur3)"/>
    <path d="{mirror('M306,1096 C352,1052 405,1008 452,968 C460,945 466,925 472,904')}" stroke="#000" stroke-width="18" opacity=".2" fill="none" filter="url(#blur6)"/>
    <path d="{STITCH_R}" stroke="#000" stroke-width="1.2" stroke-dasharray="4 3" opacity=".16" fill="none"/>
  </g>
  <!-- thin edge lines give the cloth some thickness -->
  <path d="{COLLAR_L}" fill="none" stroke="#000" stroke-width="1" opacity=".18"/>
  <path d="{COLLAR_R}" fill="none" stroke="#000" stroke-width="1" opacity=".22"/>
</svg>

<!-- 3. logo + type -->
<svg id="logo" viewBox="0 233 2000 1534" aria-label="The Alpha Made">
  <path fill="#fff" fill-rule="evenodd" d="{LOGO_D}"/>
</svg>
<h1 id="headline">HAPPY<br>INTERNATIONAL<br>MEN'S DAY</h1>
<div id="note">To the men building legacies, leading with purpose,<br>creating with dignity and breaking boundaries,<br>we honour and celebrate you!</div>

</div>
</body></html>
"""

open(os.path.join(HERE, "poster.html"), "w").write(HTML)
print("wrote poster.html")
