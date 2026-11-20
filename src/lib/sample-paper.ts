import { type QuestionEvaluation, type VisionEvaluation } from './storage';

// High-resolution handwritten student exam sheet SVG for Page 1
const PAGE_1_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <defs>
    <filter id="paper-texture" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feDiffuseLighting in="noise" lighting-color="#fdfbf7" surfaceScale="1" result="light">
        <feDistantLight azimuth="60" elevation="50" />
      </feDiffuseLighting>
      <feBlend mode="multiply" in="SourceGraphic" in2="light" />
    </filter>
  </defs>

  <!-- Sheet Background -->
  <rect width="800" height="1100" fill="#faf7ee" />
  
  <!-- Subtle sheet margins -->
  <line x1="0" y1="110" x2="800" y2="110" stroke="#f2a8b5" stroke-width="2" />
  <line x1="95" y1="0" x2="95" y2="1100" stroke="#f2a8b5" stroke-width="1.5" />
  
  <!-- Horizontal ruled lines -->
  <g stroke="#e2ded4" stroke-width="1" stroke-dasharray="1 0">
    <line x1="0" y1="150" x2="800" y2="150" /><line x1="0" y1="188" x2="800" y2="188" />
    <line x1="0" y1="226" x2="800" y2="226" /><line x1="0" y1="264" x2="800" y2="264" />
    <line x1="0" y1="302" x2="800" y2="302" /><line x1="0" y1="340" x2="800" y2="340" />
    <line x1="0" y1="378" x2="800" y2="378" /><line x1="0" y1="416" x2="800" y2="416" />
    <line x1="0" y1="454" x2="800" y2="454" /><line x1="0" y1="492" x2="800" y2="492" />
    <line x1="0" y1="530" x2="800" y2="530" /><line x1="0" y1="568" x2="800" y2="568" />
    <line x1="0" y1="606" x2="800" y2="606" /><line x1="0" y1="644" x2="800" y2="644" />
    <line x1="0" y1="682" x2="800" y2="682" /><line x1="0" y1="720" x2="800" y2="720" />
    <line x1="0" y1="758" x2="800" y2="758" /><line x1="0" y1="796" x2="800" y2="796" />
    <line x1="0" y1="834" x2="800" y2="834" /><line x1="0" y1="872" x2="800" y2="872" />
    <line x1="0" y1="910" x2="800" y2="910" /><line x1="0" y1="948" x2="800" y2="948" />
    <line x1="0" y1="986" x2="800" y2="986" /><line x1="0" y1="1024" x2="800" y2="1024" />
  </g>

  <!-- Header handwritten info -->
  <text x="110" y="65" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a">STUDENT: Maya Robinson</text>
  <text x="440" y="65" font-family="'Courier New', Courier, monospace" font-size="14" fill="#334155">EXAM: Science Mid-term</text>
  <text x="110" y="95" font-family="'Courier New', Courier, monospace" font-size="13" fill="#64748b">CLASS: Year 8 Science · Sec A</text>
  <text x="680" y="95" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">PAGE 1 / 2</text>

  <!-- Margin Q1 indicator -->
  <text x="35" y="180" font-family="monospace" font-size="20" font-weight="900" fill="#09090B">Q1.</text>

  <!-- Handwritten ink simulation for Q1 -->
  <text x="115" y="180" font-family="'Comic Sans MS', 'Chalkboard SE', 'Segoe Print', cursive, sans-serif" font-size="18" fill="#1e293b" font-weight="600">Identifying Reaction Types &amp; Diagram Analysis</text>
  
  <text x="115" y="218" font-family="'Comic Sans MS', cursive, sans-serif" font-size="16" fill="#1e293b">(a) 2Mg (s) + O₂ (g)  ───&gt;  2MgO (s)</text>
  <text x="145" y="256" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#047857">✓ Type: Combination / Synthesis reaction (Magnesium oxide formed)</text>
  
  <text x="115" y="294" font-family="'Comic Sans MS', cursive, sans-serif" font-size="16" fill="#1e293b">(b) Zn (s) + 2HCl (aq) ───&gt; ZnCl₂ (aq) + H₂ (g)</text>
  <text x="145" y="332" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#047857">✓ Type: Single Displacement reaction. Hydrogen effervescence.</text>

  <text x="115" y="370" font-family="'Comic Sans MS', cursive, sans-serif" font-size="16" fill="#1e293b">(c) Apparatus Sketch &amp; Observations:</text>
  
  <!-- Sketch for Q1 -->
  <g transform="translate(130, 395)" stroke="#1e293b" stroke-width="2" fill="none">
    <!-- Test Tube -->
    <path d="M 40,0 L 40,110 C 40,130 70,130 70,110 L 70,0" />
    <ellipse cx="55" cy="0" rx="15" ry="4" stroke="#1e293b" />
    <!-- Liquid -->
    <path d="M 42,65 C 50,60 60,70 68,65 L 68,110 C 68,126 42,126 42,110 Z" fill="#93c5fd" opacity="0.4" />
    <!-- Bubbles -->
    <circle cx="50" cy="85" r="3" fill="#3b82f6" />
    <circle cx="58" cy="72" r="2.5" fill="#3b82f6" />
    <circle cx="53" cy="98" r="3.5" fill="#3b82f6" />
    <!-- Labels -->
    <line x1="68" y1="75" x2="130" y2="75" stroke="#64748b" stroke-width="1" />
    <text x="135" y="79" font-family="monospace" font-size="12" fill="#09090B" stroke="none">dilute HCl + Zn gran.</text>
    <line x1="55" y1="125" x2="130" y2="125" stroke="#64748b" stroke-width="1" />
    <text x="135" y="129" font-family="monospace" font-size="12" fill="#09090B" stroke="none">H₂ gas bubbles</text>
  </g>

  <!-- Teacher note stamp for Q1 -->
  <g transform="translate(620, 160)">
    <rect width="130" height="42" fill="#dcfce7" stroke="#10B981" stroke-width="2" rx="4" />
    <text x="65" y="26" font-family="monospace" font-size="16" font-weight="900" fill="#065f46" text-anchor="middle">22 / 25 MARKS</text>
  </g>

  <!-- Margin Q2 indicator -->
  <text x="35" y="606" font-family="monospace" font-size="20" font-weight="900" fill="#09090B">Q2.</text>

  <!-- Q2 Student writing -->
  <text x="115" y="606" font-family="'Comic Sans MS', cursive, sans-serif" font-size="18" fill="#1e293b" font-weight="600">Balancing Redox &amp; Multi-Step Equations (Spans Pg 1-2)</text>

  <text x="115" y="644" font-family="'Comic Sans MS', cursive, sans-serif" font-size="16" fill="#1e293b">Unbalanced: Fe₂O₃ + CO  ───&gt;  Fe + CO₂</text>
  <text x="115" y="682" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Step 1: Balance Iron (Fe) atoms on product side:</text>
  <text x="145" y="720" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Fe₂O₃ + CO  ───&gt;  2Fe + CO₂</text>
  
  <text x="115" y="758" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Step 2: Balance Oxygen and Carbon using mole ratio:</text>
  <text x="145" y="796" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Fe₂O₃ + 3CO  ───&gt;  2Fe + 3CO₂</text>
  <text x="145" y="834" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#047857">✓ Balanced! (Fe: 2=2, C: 3=3, O: 3+3=6)</text>

  <text x="115" y="872" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Step 3: Molar mass calculations for 50g hematite ore:</text>
  <text x="145" y="910" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">M(Fe₂O₃) = 2(55.85) + 3(16.0) = 111.7 + 48 = 159.7 g/mol</text>
  <text x="145" y="948" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">n = 50 / 159.7 = 0.313 mol</text>
  
  <text x="115" y="1020" font-family="monospace" font-size="14" font-style="italic" fill="#b91c1c">[ Question 2 continues onto Page 2 for theoretical yield ───&gt; ]</text>
</svg>`;

// High-resolution handwritten student exam sheet SVG for Page 2
const PAGE_2_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <!-- Sheet Background -->
  <rect width="800" height="1100" fill="#faf7ee" />
  
  <!-- Subtle sheet margins -->
  <line x1="0" y1="110" x2="800" y2="110" stroke="#f2a8b5" stroke-width="2" />
  <line x1="95" y1="0" x2="95" y2="1100" stroke="#f2a8b5" stroke-width="1.5" />
  
  <!-- Horizontal ruled lines -->
  <g stroke="#e2ded4" stroke-width="1">
    <line x1="0" y1="150" x2="800" y2="150" /><line x1="0" y1="188" x2="800" y2="188" />
    <line x1="0" y1="226" x2="800" y2="226" /><line x1="0" y1="264" x2="800" y2="264" />
    <line x1="0" y1="302" x2="800" y2="302" /><line x1="0" y1="340" x2="800" y2="340" />
    <line x1="0" y1="378" x2="800" y2="378" /><line x1="0" y1="416" x2="800" y2="416" />
    <line x1="0" y1="454" x2="800" y2="454" /><line x1="0" y1="492" x2="800" y2="492" />
    <line x1="0" y1="530" x2="800" y2="530" /><line x1="0" y1="568" x2="800" y2="568" />
    <line x1="0" y1="606" x2="800" y2="606" /><line x1="0" y1="644" x2="800" y2="644" />
    <line x1="0" y1="682" x2="800" y2="682" /><line x1="0" y1="720" x2="800" y2="720" />
    <line x1="0" y1="758" x2="800" y2="758" /><line x1="0" y1="796" x2="800" y2="796" />
    <line x1="0" y1="834" x2="800" y2="834" /><line x1="0" y1="872" x2="800" y2="872" />
    <line x1="0" y1="910" x2="800" y2="910" /><line x1="0" y1="948" x2="800" y2="948" />
    <line x1="0" y1="986" x2="800" y2="986" /><line x1="0" y1="1024" x2="800" y2="1024" />
  </g>

  <!-- Header -->
  <text x="110" y="65" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a">STUDENT: Maya Robinson</text>
  <text x="440" y="65" font-family="'Courier New', Courier, monospace" font-size="14" fill="#334155">EXAM: Science Mid-term</text>
  <text x="680" y="95" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">PAGE 2 / 2</text>

  <!-- Q2 continuation -->
  <text x="115" y="150" font-family="'Comic Sans MS', cursive, sans-serif" font-size="16" fill="#1e293b" font-weight="bold">[ Q2 CONTINUED FROM PAGE 1 ]</text>
  
  <text x="115" y="188" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Theoretical Yield of Fe = 0.313 × 2 = 0.626 mol</text>
  <text x="115" y="226" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Mass Fe = 0.626 × 55.85 = 34.96 grams</text>

  <!-- Teacher red-ink correction on Q2 -->
  <g transform="translate(115, 255)">
    <text x="30" y="20" font-family="'Caveat', cursive, sans-serif" font-size="17" fill="#dc2626" font-weight="bold">⚠ Note: Missed SI unit notation on intermediate step!</text>
    <path d="M 10,25 C 80,45 220,15 360,28" stroke="#dc2626" stroke-width="2" fill="none" />
  </g>

  <!-- Teacher mark stamp Q2 -->
  <g transform="translate(620, 160)">
    <rect width="130" height="42" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" rx="4" />
    <text x="65" y="26" font-family="monospace" font-size="16" font-weight="900" fill="#92400e" text-anchor="middle">24 / 35 MARKS</text>
  </g>

  <!-- Margin Q3 indicator -->
  <text x="35" y="378" font-family="monospace" font-size="20" font-weight="900" fill="#09090B">Q3.</text>

  <!-- Q3 Content -->
  <text x="115" y="378" font-family="'Comic Sans MS', cursive, sans-serif" font-size="18" fill="#1e293b" font-weight="600">Molar Concentration &amp; Acid-Base Neutralization</text>
  
  <text x="115" y="416" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Titration data: 25.0 mL of unknown NaOH neutralized by 18.4 mL of 0.12 M H₂SO₄</text>
  <text x="115" y="454" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Balanced: 2NaOH + H₂SO₄  ───&gt;  Na₂SO₄ + 2H₂O</text>
  
  <text x="115" y="492" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Moles of H₂SO₄ = C × V = 0.12 × (18.4 / 1000) = 0.002208 mol</text>
  
  <text x="115" y="530" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Moles of NaOH required = 2 × 0.002208 = 0.004416 mol</text>
  
  <text x="115" y="568" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Molarity of NaOH = Moles / Volume</text>
  <text x="145" y="606" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">= 0.004416 / 0.025</text>
  <text x="145" y="644" font-family="'Comic Sans MS', cursive, sans-serif" font-size="16" font-weight="bold" fill="#09090B">= 0.1766 M (approx 0.177 mol/L)</text>
  <rect x="140" y="622" width="280" height="30" stroke="#09090B" stroke-width="2" fill="none" />

  <text x="115" y="720" font-family="'Comic Sans MS', cursive, sans-serif" font-size="15" fill="#1e293b">Indicator choice: Phenolphthalein used (colorless to light pink).</text>

  <!-- Teacher mark stamp Q3 -->
  <g transform="translate(620, 480)">
    <rect width="130" height="42" fill="#dcfce7" stroke="#10B981" stroke-width="2" rx="4" />
    <text x="65" y="26" font-family="monospace" font-size="16" font-weight="900" fill="#065f46" text-anchor="middle">22 / 40 MARKS</text>
  </g>

  <!-- Final score badge at bottom -->
  <g transform="translate(115, 840)">
    <rect width="560" height="120" fill="#09090B" stroke="#09090B" stroke-width="2" />
    <rect x="-4" y="-4" width="560" height="120" fill="#E52237" opacity="0.3" />
    <text x="30" y="45" font-family="monospace" font-size="12" font-weight="bold" fill="#10B981" letter-spacing="2">TEACHER EVALUATION SUMMARY</text>
    <text x="30" y="80" font-family="monospace" font-size="32" font-weight="900" fill="#FFFFFF">TOTAL: 68 / 100 (68%)</text>
    <text x="30" y="102" font-family="'Courier New', Courier, monospace" font-size="12" fill="#94a3b8">Q1: 22/25 · Q2: 24/35 · Q3: 22/40 · Rubrica AI Assessed</text>
  </g>
</svg>`;

// High-resolution printed Question Paper SVG for re-use & testing
const QUESTION_PAPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <!-- Sheet Background -->
  <rect width="800" height="1100" fill="#ffffff" />
  <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#09090B" stroke-width="2" />
  
  <!-- Header Banner -->
  <rect x="25" y="25" width="750" height="90" fill="#09090B" />
  <text x="400" y="60" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="bold" fill="#ffffff" letter-spacing="3">HAWTHORNE ACADEMY</text>
  <text x="400" y="85" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="13" fill="#10B981" letter-spacing="1">DEPARTMENT OF NATURAL SCIENCES · MID-TERM ASSESSMENT</text>

  <!-- Exam Metadata Bar -->
  <rect x="25" y="115" width="750" height="40" fill="#f4f4f5" stroke="#09090B" stroke-width="1" />
  <text x="45" y="140" font-family="'Courier New', monospace" font-size="12" font-weight="bold" fill="#09090B">SUBJECT: Science / Chemistry (Year 8)</text>
  <text x="430" y="140" font-family="'Courier New', monospace" font-size="12" fill="#09090B">TIME: 90 MINS</text>
  <text x="640" y="140" font-family="'Courier New', monospace" font-size="12" font-weight="bold" fill="#E52237">MAX MARKS: 100</text>

  <!-- Instructions -->
  <rect x="45" y="170" width="710" height="45" fill="#fefce8" stroke="#eab308" stroke-width="1" />
  <text x="55" y="190" font-family="sans-serif" font-size="11" font-weight="bold" fill="#854d0e">INSTRUCTIONS FOR CANDIDATES:</text>
  <text x="55" y="206" font-family="sans-serif" font-size="11" fill="#713f12">Answer all questions in the ruled answer sheet provided. State proper SI units and write balanced equations.</text>

  <!-- Section A: Q1 -->
  <line x1="45" y1="230" x2="755" y2="230" stroke="#09090B" stroke-width="1.5" />
  <text x="45" y="255" font-family="sans-serif" font-size="14" font-weight="bold" fill="#09090B">SECTION A — REACTION TYPES &amp; OBSERVATIONS</text>
  <text x="660" y="255" font-family="monospace" font-size="13" font-weight="bold" fill="#09090B">[25 MARKS]</text>

  <text x="45" y="285" font-family="sans-serif" font-size="13" font-weight="bold" fill="#09090B">Question 1:</text>
  <text x="45" y="308" font-family="sans-serif" font-size="12" fill="#334155">(a) Classify the following chemical reaction and describe the appearance of the product formed:</text>
  <text x="75" y="330" font-family="monospace" font-size="13" font-weight="bold" fill="#09090B">2Mg(s) + O₂(g) ───&gt; 2MgO(s)</text>
  <text x="690" y="330" font-family="monospace" font-size="11" fill="#64748b">(8 Marks)</text>

  <text x="45" y="360" font-family="sans-serif" font-size="12" fill="#334155">(b) Identify the reaction type when zinc granules react with dilute hydrochloric acid:</text>
  <text x="75" y="382" font-family="monospace" font-size="13" font-weight="bold" fill="#09090B">Zn(s) + 2HCl(aq) ───&gt; ZnCl₂(aq) + H₂(g)</text>
  <text x="690" y="382" font-family="monospace" font-size="11" fill="#64748b">(7 Marks)</text>

  <text x="45" y="412" font-family="sans-serif" font-size="12" fill="#334155">(c) Draw a neat labeled apparatus diagram demonstrating the collection and testing of hydrogen gas.</text>
  <text x="690" y="412" font-family="monospace" font-size="11" fill="#64748b">(10 Marks)</text>

  <!-- Section B: Q2 -->
  <line x1="45" y1="445" x2="755" y2="445" stroke="#09090B" stroke-width="1.5" />
  <text x="45" y="470" font-family="sans-serif" font-size="14" font-weight="bold" fill="#09090B">SECTION B — EQUATION BALANCING &amp; REDOX</text>
  <text x="660" y="470" font-family="monospace" font-size="13" font-weight="bold" fill="#09090B">[35 MARKS]</text>

  <text x="45" y="500" font-family="sans-serif" font-size="13" font-weight="bold" fill="#09090B">Question 2:</text>
  <text x="45" y="523" font-family="sans-serif" font-size="12" fill="#334155">(a) Balance the redox thermite reaction between aluminum and iron(III) oxide with phase states:</text>
  <text x="75" y="545" font-family="monospace" font-size="13" font-weight="bold" fill="#09090B">__ Al(s) + __ Fe₂O₃(s) ───&gt; __ Al₂O₃(s) + __ Fe(l)</text>
  <text x="690" y="545" font-family="monospace" font-size="11" fill="#64748b">(15 Marks)</text>

  <text x="45" y="575" font-family="sans-serif" font-size="12" fill="#334155">(b) Calculate the theoretical yield of metallic iron produced from 54.0 g of aluminum, given atomic</text>
  <text x="45" y="593" font-family="sans-serif" font-size="12" fill="#334155">weights: Al = 27.0 g/mol, Fe = 55.8 g/mol, O = 16.0 g/mol. Show all intermediate steps.</text>
  <text x="690" y="593" font-family="monospace" font-size="11" fill="#64748b">(20 Marks)</text>

  <!-- Section C: Q3 -->
  <line x1="45" y1="625" x2="755" y2="625" stroke="#09090B" stroke-width="1.5" />
  <text x="45" y="650" font-family="sans-serif" font-size="14" font-weight="bold" fill="#09090B">SECTION C — QUANTITATIVE TITRATION &amp; STOICHIOMETRY</text>
  <text x="660" y="650" font-family="monospace" font-size="13" font-weight="bold" fill="#09090B">[40 MARKS]</text>

  <text x="45" y="680" font-family="sans-serif" font-size="13" font-weight="bold" fill="#09090B">Question 3:</text>
  <text x="45" y="703" font-family="sans-serif" font-size="12" fill="#334155">A 25.0 cm³ aliquot of sodium hydroxide solution (NaOH) requires 18.5 cm³ of 0.100 M hydrochloric acid</text>
  <text x="45" y="721" font-family="sans-serif" font-size="12" fill="#334155">(HCl) to reach phenolphthalein end-point in a volumetric titration experiment.</text>
  <text x="45" y="749" font-family="sans-serif" font-size="12" fill="#334155">(a) Write the net ionic equation for the neutralization process.</text>
  <text x="690" y="749" font-family="monospace" font-size="11" fill="#64748b">(10 Marks)</text>
  <text x="45" y="777" font-family="sans-serif" font-size="12" fill="#334155">(b) Calculate the molar concentration (molarity) of the sodium hydroxide solution in mol/dm³.</text>
  <text x="690" y="777" font-family="monospace" font-size="11" fill="#64748b">(15 Marks)</text>
  <text x="45" y="805" font-family="sans-serif" font-size="12" fill="#334155">(c) Convert this concentration into g/dm³ (Molar mass of NaOH = 40.0 g/mol). State to 3 sig figs.</text>
  <text x="690" y="805" font-family="monospace" font-size="11" fill="#64748b">(15 Marks)</text>

  <!-- Footer -->
  <line x1="45" y1="1020" x2="755" y2="1020" stroke="#09090B" stroke-width="1" />
  <text x="400" y="1045" text-anchor="middle" font-family="monospace" font-size="11" fill="#64748b">--- END OF QUESTION PAPER · HAWTHORNE ACADEMY 2026 ---</text>
</svg>`;

export const SAMPLE_PAGE_1_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(PAGE_1_SVG)}`;
export const SAMPLE_PAGE_2_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(PAGE_2_SVG)}`;
export const SAMPLE_QUESTION_PAPER_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(QUESTION_PAPER_SVG)}`;

export const SAMPLE_BETA_QUESTIONS: QuestionEvaluation[] = [
  {
    questionNumber: 'Q1',
    pages: [1],
    maxMarks: 25,
    marksAwarded: 22,
    reason: 'Correct reaction classifications and neat test-tube diagram with hydrogen gas bubbles. Lost 3 marks for incomplete SI units.'
  },
  {
    questionNumber: 'Q2',
    pages: [1, 2],
    maxMarks: 35,
    marksAwarded: 24,
    reason: 'Multi-step equation balancing spans Page 1 and 2. Fe₂O₃ reduction correctly balanced. Lost 11 marks due to missing phase notations and intermediate mass precision slip on Page 2.'
  },
  {
    questionNumber: 'Q3',
    pages: [2],
    maxMarks: 40,
    marksAwarded: 22,
    reason: 'Titration stoichiometric calculation attempted on Page 2. NaOH molarity setup is correct, but missed temperature-dependent equilibrium derivation.'
  }
];

export const SAMPLE_BETA_RESULT: VisionEvaluation = {
  score: 68,
  maxScore: 100,
  percentage: 68,
  confirmedStrengths: [
    'Identifying chemical reaction types',
    'Clear apparatus diagram labeling',
    'Stoichiometric molarity setup'
  ],
  watchOutAreas: [
    'Balancing multi-step chemical equations',
    'Missing SI units and phase notations (aq, g, s)',
    'Significant figures precision on Page 2'
  ],
  overallFeedback: 'Strong foundational grasp of reaction classifications and apparatus diagrams. Lost marks on calculation details and equation phase symbols.',
  detailedAnalysis: 'Demonstrated solid grasp of reaction classifications on Page 1. Calculation steps on Page 2 lacked standard SI units, and the redox reaction balancing was incomplete.',
  questions: SAMPLE_BETA_QUESTIONS
};
