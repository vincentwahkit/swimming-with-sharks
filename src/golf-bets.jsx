import { useState, useRef, useCallback } from "react";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = ["#4ade80", "#60a5fa", "#f97316", "#e879f9"];
const VEGAS_VAL = 1;
const CT_VAL = 3;
const P3_VAL = 5;
// Laguna National Classic Course, Singapore — Black tees, Par 72
const LAGUNA_CLASSIC_HOLES = [
  {par:4,si:12},{par:4,si:4},{par:5,si:2},{par:3,si:16},
  {par:4,si:8},{par:4,si:10},{par:3,si:18},{par:4,si:14},
  {par:5,si:6},{par:4,si:5},{par:3,si:15},{par:4,si:1},
  {par:5,si:11},{par:5,si:7},{par:4,si:17},{par:4,si:9},
  {par:3,si:13},{par:4,si:3},
];

// Laguna National Masters Course, Singapore — Blue tees, Par 72
const LAGUNA_MASTERS_HOLES = [
  {par:4,si:15},{par:5,si:1},{par:4,si:9},{par:4,si:13},
  {par:3,si:17},{par:4,si:3},{par:5,si:5},{par:3,si:11},
  {par:4,si:7},{par:4,si:16},{par:5,si:2},{par:3,si:18},
  {par:4,si:12},{par:4,si:10},{par:5,si:8},{par:4,si:4},
  {par:3,si:14},{par:4,si:6},
];

// Horizon Hills Golf & Country Club, Malaysia — Blue tees, Par 72
const HORIZON_HILLS_HOLES = [
  {par:4,si:11},{par:5,si:1},{par:3,si:15},{par:4,si:17},
  {par:4,si:13},{par:5,si:5},{par:4,si:3},{par:3,si:9},
  {par:4,si:7},{par:4,si:10},{par:4,si:6},{par:3,si:14},
  {par:5,si:16},{par:4,si:2},{par:4,si:8},{par:4,si:18},
  {par:3,si:12},{par:5,si:4},
];

// NSRCC Changi Golf Course, Singapore — Blue tees, Par 72
const NSRCC_CHANGI_HOLES = [
  {par:4,si:4},{par:5,si:2},{par:5,si:10},{par:4,si:6},
  {par:4,si:8},{par:3,si:16},{par:4,si:12},{par:4,si:14},
  {par:3,si:18},{par:4,si:11},{par:4,si:1},{par:3,si:17},
  {par:4,si:3},{par:5,si:5},{par:3,si:15},{par:4,si:9},
  {par:4,si:13},{par:5,si:7},
];

// Sembawang Country Club — Front 9 x2, Composite 18 (April 2026)
// Front 9: odd SI per official scorecard
// Back 9:  same pars, interleaved even SI in same difficulty order
const SEMBAWANG_BACK9_HOLES = [
  // Front 9 (holes 1-9) — odd SI
  {par:4,si:11},{par:5,si:1},{par:5,si:3},{par:4,si:13},
  {par:4,si:5},{par:4,si:9},{par:3,si:17},{par:4,si:7},
  {par:3,si:15},
  // Back 9 (holes 10-18) — even SI (same difficulty order)
  {par:4,si:12},{par:5,si:2},{par:5,si:4},{par:4,si:14},
  {par:4,si:6},{par:4,si:10},{par:3,si:18},{par:4,si:8},
  {par:3,si:16},
];
const DEFAULT_HOLES = LAGUNA_CLASSIC_HOLES;
const PRESET_COURSES = [
  { id: "laguna-classic", name: "Laguna National", tee: "Classic (Black)", holes: LAGUNA_CLASSIC_HOLES },
  { id: "laguna-masters", name: "Laguna National", tee: "Masters (Blue)", holes: LAGUNA_MASTERS_HOLES },
  { id: "horizon-hills", name: "Horizon Hills", tee: "Blue", holes: HORIZON_HILLS_HOLES },
  { id: "nsrcc-changi", name: "NSRCC Changi", tee: "Blue", holes: NSRCC_CHANGI_HOLES },
  { id: "sembawang-back9", name: "Sembawang CC", tee: "Composite 18 (Black)", holes: SEMBAWANG_BACK9_HOLES },
];

// ─────────────────────────────────────────────────────────────────────────────
// PURE COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────
function strokesGiven(hcp, si) {
  if (hcp <= 0) return 0;
  let s = 0;
  if (si <= hcp) s += 1;
  if (si <= hcp - 18) s += 1;
  return s;
}
function nettScore(gross, hcp, si, par) {
  const g = parseInt(gross, 10);
  if (isNaN(g) || g <= 0) return null;
  const raw = g - strokesGiven(hcp, si);
  const cap = par === 3 ? par + 3 : par + 4;
  return Math.min(raw, cap);
}
function vegasNum(n1, n2) {
  if (n1 === null || n2 === null) return null;
  const lo = Math.min(n1, n2);
  const hi = Math.max(n1, n2);
  return lo * 10 + hi;
}
function flipNum(n) {
  const lo = Math.floor(n / 10);
  const hi = n % 10;
  return hi * 10 + lo;
}
function teamTrigger(g1, g2, par) {
  function valid(g) { const n = parseInt(g, 10); return !isNaN(n) && n > 0; }
  function isEagle(g) { return valid(g) && parseInt(g, 10) <= par - 2; }
  function isBirdie(g) { return valid(g) && parseInt(g, 10) === par - 1; }
  function isPar(g) { return valid(g) && parseInt(g, 10) === par; }
  const eagle = isEagle(g1) || isEagle(g2);
  const birdies = [g1, g2].filter(isBirdie).length;
  const pars = [g1, g2].filter(isPar).length;
  const parOrBetter = (g) => valid(g) && parseInt(g, 10) <= par;
  // Eagle: flip + x2 always; +20 bonus only if partner also makes par or better
  if (eagle) {
    const partnerParOrBetter = isEagle(g1) ? parOrBetter(g2) : parOrBetter(g1);
    return { flip: true, mult: 2, bonus: partnerParOrBetter ? 20 : 0 };
  }
  if (birdies >= 2) return { flip: true, mult: 2, bonus: 20 };
  if (birdies === 1 && pars >= 1) return { flip: true, mult: 1, bonus: 20 };
  if (birdies === 1) return { flip: true, mult: 1, bonus: 0 };
  if (pars >= 2) return { flip: false, mult: 1, bonus: 10 };
  return { flip: false, mult: 1, bonus: 0 };
}
function computeVegas(teams, gross, nett, par) {
  const [t0, t1] = teams;
  const vA = vegasNum(nett[t0[0]], nett[t0[1]]);
  const vB = vegasNum(nett[t1[0]], nett[t1[1]]);
  if (vA === null || vB === null) return null;
  if (vA === vB) {
    // Nett tie — check if a bonus trigger exists using either team's gross scores
    // Award bonus to team with better (lower) gross Vegas number; if also tied, no bonus
    const gvA = vegasNum(parseInt(gross[t0[0]],10), parseInt(gross[t0[1]],10));
    const gvB = vegasNum(parseInt(gross[t1[0]],10), parseInt(gross[t1[1]],10));
    const trigA = teamTrigger(gross[t0[0]], gross[t0[1]], par);
    const trigB = teamTrigger(gross[t1[0]], gross[t1[1]], par);
    const bonus = (trigA.bonus > 0 || trigB.bonus > 0) && gvA !== gvB
      ? (gvA < gvB ? trigA.bonus || trigB.bonus : trigA.bonus || trigB.bonus)
      : 0;
    const grossWinnerIsA = gvA < gvB;
    const netA = bonus > 0 ? (grossWinnerIsA ? bonus : -bonus) : 0;
    const netB = bonus > 0 ? (grossWinnerIsA ? -bonus : bonus) : 0;
    return { vA, vB, effA: vA, effB: vB, flipA: false, flipB: false, mult: 1,
      tied: true, grossWinnerIsA: bonus > 0 ? grossWinnerIsA : null,
      bonusA: bonus > 0 && grossWinnerIsA ? bonus : 0,
      bonusB: bonus > 0 && !grossWinnerIsA ? bonus : 0,
      netA, netB };
  }
  const winnerIsA = vA < vB;
  const wg = winnerIsA ? [gross[t0[0]], gross[t0[1]]] : [gross[t1[0]], gross[t1[1]]];
  const trig = teamTrigger(wg[0], wg[1], par);
  const effA = (!winnerIsA && trig.flip) ? flipNum(vA) : vA;
  const effB = ( winnerIsA && trig.flip) ? flipNum(vB) : vB;
  const diff = Math.abs(effA - effB) * trig.mult;
  const baseA = winnerIsA ? diff : -diff;
  const baseB = winnerIsA ? -diff : diff;
  const netA = baseA + (winnerIsA ? trig.bonus : -trig.bonus);
  const netB = baseB + (winnerIsA ? -trig.bonus : trig.bonus);
  return { vA, vB, effA, effB,
    flipA: !winnerIsA && trig.flip,
    flipB: winnerIsA && trig.flip,
    mult: trig.mult,
    bonusA: winnerIsA ? trig.bonus : 0,
    bonusB: winnerIsA ? 0 : trig.bonus,
    netA, netB };
}
function computeCutThroat(nett) {
  if (nett.some(n => n === null)) return [0, 0, 0, 0];
  const d = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
      if (nett[i] < nett[j]) { d[i]++; d[j]--; }
      else if (nett[j] < nett[i]) { d[j]++; d[i]--; }
    }
  return d;
}
function computePar3(nett, banker, mults) {
  const d = [0, 0, 0, 0];
  const bMult = Number(mults[banker]) || 1;
  for (let i = 0; i < 4; i++) {
    if (i === banker) continue;
    if (nett[i] === null || nett[banker] === null) continue;
    const pMult = Number(mults[i]) || 1;
    const matchupMult = bMult * pMult;
    if (nett[i] < nett[banker]) { d[i] += matchupMult; d[banker] -= matchupMult; }
    else if (nett[banker] < nett[i]) { d[banker] += matchupMult; d[i] -= matchupMult; }
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function makeFilename(courseName) {
  const now = new Date();
  const date = now.toISOString().slice(0,10).replace(/-/g,"");
  const time = String(now.getHours()).padStart(2,"0") + String(now.getMinutes()).padStart(2,"0");
  const course = (courseName||"Custom")
    .split(/[\s\-_\/]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("")
    .replace(/[^a-zA-Z0-9]/g,"")
    .slice(0,10);
  return `sws.EX.${date}.${course}.${time}.json`;
}

async function exportRound(roundData) {
  const json = JSON.stringify(roundData, null, 2);
  const filename = makeFilename(roundData.courseName);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });
  // Try Web Share API with files (iOS 15+, Android Chrome)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  // Fallback: direct download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function haptic(style = "light") {
  try {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(style === "light" ? 10 : 20);
    }
    // iOS Taptic Engine via AudioContext workaround is not reliable
    // Best effort via vibration API
  } catch(_) {}
}

function generateReport({ names, holes, liveHcps, inPlay, results, dollars, vegasCum, ctCum, p3Cum, vegasVal, ctVal, p3Val, adjustments, games, courseName, roundStartTime }) {
  // Relative HCPs
  const minHcp = Math.min(...liveHcps);
  const relHcps = liveHcps.map(h => h - minHcp);

  // Next round HCP adjustment
  const strokeAdj = [0,1,2,3].map(i => {
    const strokes = Math.floor(Math.abs(dollars[i]) / 25);
    return dollars[i] > 0 ? -strokes : dollars[i] < 0 ? strokes : 0;
  });
  const adjHcps = [0,1,2,3].map(i => liveHcps[i] + strokeAdj[i]);
  const minAdj = Math.min(...adjHcps);
  const nextRelHcps = adjHcps.map(h => h - minAdj);

  // Date and time of day
  const now = roundStartTime ? new Date(roundStartTime) : new Date();
  const dateStr = now.toLocaleDateString("en-SG", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "Morning" : "Afternoon";
  const dateStamp = now.toISOString().slice(0,10).replace(/-/g,"");
  const courseSlug = (courseName||"Custom").split(/[\s\-_\/]+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join("").replace(/[^a-zA-Z0-9]/g,"").slice(0,10);
  const reportTitle = `SWS.${dateStamp}.${courseSlug}.${timeOfDay}`;

  // Score label helper
  function scoreBadgeHtml(score, par, active) {
    if (!active) return `<span style="color:#888">${score}</span>`;
    const diff = score - par;
    let shape = "";
    if (diff <= -2) shape = `<span style="border:1.5px solid #333;border-radius:50%;padding:0 3px;outline:1.5px solid #333;outline-offset:2px">${score}</span>`;
    else if (diff === -1) shape = `<span style="border:1.5px solid #333;border-radius:50%;padding:0 3px">${score}</span>`;
    else if (diff === 1) shape = `<span style="border:1.5px solid #333;padding:0 3px">${score}</span>`;
    else if (diff >= 2) shape = `<span style="border:1.5px solid #333;padding:0 3px;outline:1.5px solid #333;outline-offset:2px">${score}</span>`;
    else shape = `${score}`;
    return shape;
  }

  // Build scorecard rows
  let scRows = "";
  let outTotals = [0,0,0,0], inTotals = [0,0,0,0], grandTotals = [0,0,0,0];
  let outPar = 0, inPar = 0;

  for (let hi = 0; hi < 18; hi++) {
    const h = holes[hi];
    const active = inPlay[hi];
    const rowStyle = active ? "" : "opacity:0.4;background:#f5f5f5;";
    let row = `<tr style="${rowStyle}">
      <td style="text-align:center;font-weight:600;color:#555">${hi+1}</td>
      <td style="text-align:center;color:#777">${h.par}</td>
      <td style="text-align:center;color:#999;font-size:11px">${h.si}</td>`;
    for (let pi = 0; pi < 4; pi++) {
      const g = parseInt(results[hi].g[pi], 10);
      const score = isNaN(g) ? "-" : g;
      if (!isNaN(g) && active) {
        if (hi < 9) outTotals[pi] += g; else inTotals[pi] += g;
        grandTotals[pi] += g;
      }
      row += `<td style="text-align:center">${isNaN(g) ? "-" : scoreBadgeHtml(g, h.par, active)}</td>`;
    }
    row += `</tr>`;
    scRows += row;
    if (hi < 9) outPar += h.par; else inPar += h.par;

    if (hi === 8) {
      scRows += `<tr style="background:#e8f5e8;font-weight:700">
        <td style="text-align:center">OUT</td>
        <td style="text-align:center">${outPar}</td>
        <td></td>
        ${outTotals.map(t => `<td style="text-align:center">${t||"-"}</td>`).join("")}
      </tr>`;
    }
  }
  scRows += `<tr style="background:#e8f5e8;font-weight:700">
    <td style="text-align:center">IN</td>
    <td style="text-align:center">${inPar}</td>
    <td></td>
    ${inTotals.map(t => `<td style="text-align:center">${t||"-"}</td>`).join("")}
  </tr>
  <tr style="background:#0a1a0a;color:#4ade80;font-weight:700">
    <td style="text-align:center">TOT</td>
    <td style="text-align:center">${outPar+inPar}</td>
    <td></td>
    ${grandTotals.map(t => `<td style="text-align:center">${t||"-"}</td>`).join("")}
  </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${reportTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 12px 16px; color: #222; font-size: 11px; }
  .header { background: #0a1a0a; color: #4ade80; padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 18px; letter-spacing: 3px; color: #4ade80; }
  .header-sub { color: #4a7a4a; font-size: 9px; letter-spacing: 2px; margin-top: 2px; }
  .header-right { text-align: right; font-size: 9px; color: #4a7a4a; }
  .meta-row { display: flex; gap: 20px; margin-bottom: 8px; font-size: 11px; color: #444; }
  h2 { font-size: 9px; color: #4a7a4a; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 4px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0a1a0a; color: #4ade80; padding: 4px 3px; text-align: center; font-size: 10px; }
  td { padding: 3px 3px; border-bottom: 1px solid #eee; text-align: center; font-size: 11px; }
  td.label { text-align: left; color: #555; }
  table.scorecard th:nth-child(1), table.scorecard td:nth-child(1) { width: 22px; }
  table.scorecard th:nth-child(2), table.scorecard td:nth-child(2) { width: 22px; }
  table.scorecard th:nth-child(3), table.scorecard td:nth-child(3) { width: 22px; }
  .pos { color: #16a34a; font-weight: 700; }
  .neg { color: #dc2626; font-weight: 700; }
  .total-row td { background: #0a1a0a; font-weight: 700; font-size: 12px; }
  .total-row td:first-child { color: #4ade80; }
  .total-row .pos { color: #4ade80 !important; }
  .total-row .neg { color: #f87171 !important; }
  .out-row td, .in-row td { background: #e8f5e8; font-weight: 700; font-size: 11px; }
  .footer { text-align: center; color: #bbb; font-size: 9px; margin-top: 8px; border-top: 1px solid #eee; padding-top: 6px; }
  @media print {
    body { padding: 8px; }
    .no-print { display: none; }
    @page { margin: 10mm; size: A4; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>SWIMMING WITH SHARKS</h1>
      <div class="header-sub">VEGAS · CUT THROAT · BANKER</div>
    </div>
    <div class="header-right" style="color:#e8f5e8">
      <div>${dateStr}</div>
      <div>${timeOfDay} · ${courseName || "Custom Course"}</div>
      <div style="margin-top:2px;color:#4a7a4a">vw-0.9.3</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <h2>Players</h2>
      <table>
        <tr><th style="text-align:left">Player</th><th>HCP</th><th>Rel</th><th>Next Rel</th></tr>
        ${names.map((n,i) => `<tr>
          <td style="text-align:left;font-weight:600">${n.slice(0,Math.max(2,n.length))}</td>
          <td>${liveHcps[i]}</td>
          <td>${relHcps[i]}</td>
          <td style="font-weight:700">${nextRelHcps[i]}</td>
        </tr>`).join("")}
      </table>
    </div>
    <div>
      <h2>$$$ Summary</h2>
      <table>
        <tr><th style="text-align:left"></th>${names.map(n=>`<th>${n.slice(0,Math.max(2,n.length))}</th>`).join("")}</tr>
        ${games.vegas ? `<tr><td class="label">Vegas</td>${[0,1,2,3].map(i=>{const v=vegasCum[i]*vegasVal;return`<td class="${v>0?"pos":v<0?"neg":""}">${v>0?"+":""}${v||"—"}</td>`;}).join("")}</tr>`:""}
        ${games.ct ? `<tr><td class="label">Cut Throat</td>${[0,1,2,3].map(i=>{const v=ctCum[i]*ctVal;return`<td class="${v>0?"pos":v<0?"neg":""}">${v>0?"+":""}${v||"—"}</td>`;}).join("")}</tr>`:""}
        ${games.p3 ? `<tr><td class="label">Banker</td>${[0,1,2,3].map(i=>{const v=p3Cum[i]*p3Val;return`<td class="${v>0?"pos":v<0?"neg":""}">${v>0?"+":""}${v||"—"}</td>`;}).join("")}</tr>`:""}
        ${adjustments.some(a=>a!==0)?`<tr><td class="label">Adj</td>${adjustments.map(v=>`<td class="${v>0?"pos":v<0?"neg":""}">${v>0?"+":""}${v||"—"}</td>`).join("")}</tr>`:""}
        <tr class="total-row"><td style="text-align:left">TOTAL</td>${dollars.map(v=>`<td class="${v>0?"pos":v<0?"neg":""}">${v>0?"$+":"$"}${v}</td>`).join("")}</tr>
      </table>
    </div>
  </div>

  <h2>Scorecard (Gross)</h2>
  <table class="scorecard">
    <tr>
      <th>H</th><th>Par</th><th>SI</th>
      ${names.map(n=>`<th>${n.slice(0,Math.max(2,n.length))}</th>`).join("")}
    </tr>
    ${scRows}
  </table>

  <div class="footer">
    Generated by Swimming With Sharks vw-0.9.3 · ${new Date().toLocaleString("en-SG")}
  </div>
  <div class="no-print" style="text-align:center;margin-top:10px;display:flex;gap:10px;justify-content:center">
    <button onclick="window.print()" style="padding:8px 20px;background:#0a1a0a;color:#4ade80;border:none;border-radius:6px;font-size:13px;cursor:pointer">
      🖨 Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding:8px 20px;background:#1e3a1e;color:#4ade80;border:1px solid #2a5a2a;border-radius:6px;font-size:13px;cursor:pointer">
      ← Back
    </button>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────
function Setup({ onStart, savedRounds = [], onLoadRound }) {
  const [names, setNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sws_names") || '["A","B","C","D"]'); } catch { return ["A","B","C","D"]; }
  });
  const [hcps, setHcps] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sws_hcps") || "[0,0,0,0]"); } catch { return [0,0,0,0]; }
  });
  const [holes, setHoles] = useState(DEFAULT_HOLES.map(h => ({ ...h })));
  const [vegasVal, setVegasVal] = useState(1);
  const [ctVal, setCtVal] = useState(3);
  const [p3Val, setP3Val] = useState(5);
  const [hcpThreshold, setHcpThreshold] = useState(25);
  const [courses, setCourses] = useState([]);
  const [showLib, setShowLib] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTee, setSaveTee] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [storageMsg, setStorageMsg] = useState("");
  const [loadedCourse, setLoadedCourse] = useState(PRESET_COURSES[0]);
  const [games, setGames] = useState({ vegas: true, ct: true, p3: true });
  const [importPreview, setImportPreview] = useState(null);
  const [activeSection, setActiveSection] = useState(null); // "course" | "games" | "history"
  const importRef = React.useRef();

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("swimmingWithSharks_courses");
      if (saved) setCourses(JSON.parse(saved));
    } catch (_) {}
  }, []);

  async function saveCourse() {
    if (!saveName.trim()) { setStorageMsg("Please enter a course name."); return; }
    const entry = { id: Date.now(), name: saveName.trim(), tee: saveTee.trim() || "—", note: saveNote.trim(), holes: holes.map(h => ({ ...h })) };
    const updated = [...courses, entry];
    try {
      localStorage.setItem("swimmingWithSharks_courses", JSON.stringify(updated));
      setCourses(updated); setSaveName(""); setSaveTee(""); setSaveNote(""); setShowSave(false);
      setStorageMsg(`"${entry.name} / ${entry.tee}" saved.`);
      setTimeout(() => setStorageMsg(""), 2500);
    } catch (_) { setStorageMsg("Save failed."); }
  }

  async function deleteCourse(id) {
    const updated = courses.filter(c => c.id !== id);
    try { localStorage.setItem("swimmingWithSharks_courses", JSON.stringify(updated)); setCourses(updated); } catch (_) {}
  }

  function loadCourse(course) {
    setHoles(course.holes.map(h => ({ ...h }))); setLoadedCourse(course); setShowLib(false);
    setStorageMsg(`Loaded "${course.name} / ${course.tee}"`);
    setTimeout(() => setStorageMsg(""), 2500);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.config || !data.config.names) { alert("Invalid round file."); return; }
        setImportPreview(data);
      } catch { alert("Could not read file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html { overscroll-behavior: none; overscroll-behavior-y: none; height: 100%; }
        body { overscroll-behavior: none; overscroll-behavior-y: none; height: 100%; margin: 0; }
        #root { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: none; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .pm-btn:active { transform: scale(0.92); background: #2a5a2a !important; }
        .tab-btn:active { opacity: 0.7; }
        .start-btn:active { transform: scale(0.97); }
        .hole-nav:active { transform: scale(0.95); background: #1e3a1e !important; }
        .inplay-toggle:active { opacity: 0.8; }
        .setup-row:active { opacity: 0.7; }
        select { appearance: none; -webkit-appearance: none; }
      `}</style>

      {/* Import preview modal */}
      {importPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0d2210", border: "1px solid #2a5a2a", borderRadius: 14, padding: 20, width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 11, color: COLORS[0], letterSpacing: 2, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>IMPORT ROUND</div>
            <div style={{ fontSize: 16, fontWeight: "600", color: "#e8f5e8", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{importPreview.courseName || "Round"}</div>
            <div style={{ fontSize: 12, color: "#4a7a4a", marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>{importPreview.date}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 16 }}>
              {importPreview.config.names.map((name, pi) => {
                const cfg = importPreview.config;
                const ss = cfg._savedState;
                if (!ss) return <div key={pi} />;
                const vCum=[0,0,0,0],cCum=[0,0,0,0],pCum=[0,0,0,0];
                cfg.holes.forEach((h,hi) => {
                  if (!ss.inPlay[hi]) return;
                  const g=ss.gross[hi];
                  const n=[0,1,2,3].map(p=>nettScore(g[p],ss.liveHcps[p],h.si,h.par));
                  if (cfg.games.vegas){const vr=computeVegas(ss.vTeams[hi],g,n,h.par);if(vr){ss.vTeams[hi][0].forEach(p=>{vCum[p]+=vr.netA;});ss.vTeams[hi][1].forEach(p=>{vCum[p]+=vr.netB;});}}
                  if (cfg.games.ct){const ct=computeCutThroat(n);[0,1,2,3].forEach(p=>cCum[p]+=ct[p]);}
                  if (cfg.games.p3&&h.par===3){const p3=computePar3(n,ss.banker[hi],ss.p3mult[hi]);[0,1,2,3].forEach(p=>pCum[p]+=p3[p]);}
                });
                const d=(cfg.games.vegas?vCum[pi]*cfg.vegasVal:0)+(cfg.games.ct?cCum[pi]*cfg.ctVal:0)+(cfg.games.p3?pCum[pi]*cfg.p3Val:0)+(ss.adjustments[pi]||0);
                return (
                  <div key={pi} style={{ background: "#071507", borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: COLORS[pi], marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}>{name.slice(0,5)}</div>
                    <div style={{ fontSize: 18, fontWeight: "700", color: d>0?COLORS[0]:d<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>{d>0?"+":""}{d}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { onLoadRound(importPreview); setImportPreview(null); }}
                style={{ ...S.startBtn, flex: 2, fontSize: 15, padding: "13px" }}>Load Round</button>
              <button onClick={() => setImportPreview(null)}
                style={{ ...S.startBtn, flex: 1, fontSize: 15, padding: "13px", background: "#1e3a1e", color: COLORS[0] }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 40px" }}>
        {/* Header */}
        <div style={{ position: "relative", textAlign: "center", padding: "28px 20px 16px", background: "linear-gradient(180deg, #0d2a0d 0%, #0a1a0a 100%)" }}>
          <div style={{ position: "absolute", top: 8, right: 12, fontSize: 10, color: "#5a8a5a", fontFamily: "'DM Sans', sans-serif", letterSpacing: 1 }}>vw-0.9.3</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: COLORS[0], letterSpacing: 4, margin: 0, lineHeight: 1 }}>
            SWIMMING WITH SHARKS
          </h1>
          <p style={{ color: "#4a7a4a", fontSize: 11, margin: "4px 0 0", letterSpacing: 2, fontFamily: "'DM Sans', sans-serif" }}>
            VEGAS · CUT THROAT · BANKER
          </p>
        </div>

        <div style={{ padding: "12px 16px 100px" }}>

          {/* ── Players & Handicaps ── */}
          <Sect title="Players & Handicaps">
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                <div style={{ ...S.dot, background: COLORS[i], fontFamily: "'Bebas Neue', sans-serif", fontSize: 16 }}>{i+1}</div>
                <input value={names[i]} placeholder={`Player ${i+1}`}
                  style={{ ...S.inp, flex: 3, fontSize: 16, padding: "11px 14px" }}
                  onChange={e => { const n=[...names]; n[i]=e.target.value; setNames(n); try { localStorage.setItem("sws_names", JSON.stringify(n)); } catch(_){} }} />
                <div style={{ display: "flex", alignItems: "center", background: "#071507", border: "1px solid #1e3a1e", borderRadius: 10, overflow: "hidden" }}>
                  <button className="pm-btn" onClick={() => { const h=[...hcps]; h[i]=Math.max(0,h[i]-1); setHcps(h); try{localStorage.setItem("sws_hcps",JSON.stringify(h));}catch(_){} }} style={S.pmBtnInline}>−</button>
                  <span style={{ width: 34, textAlign: "center", color: "#e8f5e8", fontSize: 17, fontWeight: "700", fontFamily: "'DM Sans', sans-serif" }}>{hcps[i]}</span>
                  <button className="pm-btn" onClick={() => { const h=[...hcps]; h[i]=Math.min(36,h[i]+1); setHcps(h); try{localStorage.setItem("sws_hcps",JSON.stringify(h));}catch(_){} }} style={S.pmBtnInline}>+</button>
                </div>
              </div>
            ))}
          </Sect>

          {/* ── Course — collapsible ── */}
          <CollapseSect title={`Course — ${loadedCourse ? loadedCourse.name : "Custom"}`} open={activeSection==="course"} onToggle={() => setActiveSection(s => s==="course" ? null : "course")}>
            {storageMsg && <div style={{ background: "#0d2a0d", border: "1px solid #4ade80", borderRadius: 6, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: "#4ade80" }}>{storageMsg}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button style={S.courseBtn} onClick={() => { setShowLib(l=>!l); setShowSave(false); }}>
                {showLib ? "Hide Library" : `📂 Library${courses.length>0?` (${courses.length})`:""}`}
              </button>
              <button style={S.courseBtn} onClick={() => { setShowSave(s=>!s); setShowLib(false); }}>
                {showSave ? "Cancel" : "💾 Save Course"}
              </button>
            </div>
            {showSave && (
              <div style={{ background: "#071507", border: "1px solid #1e3a1e", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <input value={saveName} placeholder="Course name" style={{ ...S.inp, width: "100%", marginBottom: 8, padding: "11px 14px" }} onChange={e => setSaveName(e.target.value)} />
                <input value={saveTee} placeholder="Tee box" style={{ ...S.inp, width: "100%", marginBottom: 8, padding: "11px 14px" }} onChange={e => setSaveTee(e.target.value)} />
                <input value={saveNote} placeholder="Note (e.g. Yellow tees — members only)" style={{ ...S.inp, width: "100%", marginBottom: 10, padding: "11px 14px", fontSize: 13 }} onChange={e => setSaveNote(e.target.value)} />
                <button className="start-btn" style={{ ...S.startBtn, fontSize: 14, padding: "11px" }} onClick={saveCourse}>Save</button>
              </div>
            )}
            {showLib && (
              <div style={{ background: "#071507", border: "1px solid #1e3a1e", borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: COLORS[0], letterSpacing: 2, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>PRELOADED</div>
                {PRESET_COURSES.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1e3a1e" }}>
                    <div style={{ cursor: "pointer", flex: 1 }} onClick={() => loadCourse(c)}>
                      <div style={{ fontSize: 14, color: "#e8f5e8", fontWeight: "600" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#5a8a5a" }}>⛳ {c.tee}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#3a6a3a", padding: "3px 8px", border: "1px solid #1e3a1e", borderRadius: 6 }}>built-in</div>
                  </div>
                ))}
                {courses.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: 2, margin: "10px 0 8px", fontFamily: "'DM Sans', sans-serif" }}>SAVED</div>
                    {courses.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1e3a1e" }}>
                        <div style={{ cursor: "pointer", flex: 1 }} onClick={() => loadCourse(c)}>
                          <div style={{ fontSize: 14, color: "#e8f5e8", fontWeight: "600" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#5a8a5a" }}>⛳ {c.tee}</div>
                        </div>
                        <button onClick={() => deleteCourse(c.id)} style={{ background: "transparent", border: "1px solid #5a2a2a", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 12, padding: "5px 10px" }}>✕</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {/* Compact hole table */}
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1e3a1e" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0d2210" }}>
                    {["H","Par","SI","H","Par","SI"].map((h,i) => <th key={i} style={S.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 9 }, (_, row) => (
                    <tr key={row} style={{ background: row%2===0?"#071507":"#060f06" }}>
                      {[row, row+9].map(hi => (
                        <React.Fragment key={hi}>
                          <td style={{ ...S.td, color: "#5a8a5a", fontWeight: "600" }}>{hi+1}</td>
                          <td style={S.td}>
                            <select value={holes[hi].par} style={{ ...S.sel, padding: "4px 6px", fontSize: 13 }}
                              onChange={e => { const h=holes.map(x=>({...x})); h[hi].par=Number(e.target.value); setHoles(h); }}>
                              {[3,4,5,6].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td style={S.td}>
                            <select value={holes[hi].si} style={{ ...S.sel, padding: "4px 6px", fontSize: 13 }}
                              onChange={e => { const h=holes.map(x=>({...x})); h[hi].si=Number(e.target.value); setHoles(h); }}>
                              {Array.from({length:18},(_,k)=>k+1).map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapseSect>

          {/* ── Games & Stakes — collapsible ── */}
          <CollapseSect title="Games & Stakes" open={activeSection==="games"} onToggle={() => setActiveSection(s => s==="games" ? null : "games")}>
            {/* Game toggles */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[["vegas","Vegas"],["ct","Cut Throat"],["p3","Banker"]].map(([key,label]) => {
                const on = games[key];
                return (
                  <button key={key} onClick={() => setGames(g => ({ ...g, [key]: !g[key] }))}
                    style={{ flex: 1, padding: "11px 4px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: on?"700":"400",
                      border: `1px solid ${on?COLORS[0]:"#1e3a1e"}`,
                      background: on?COLORS[0]+"22":"transparent",
                      color: on?COLORS[0]:"#4a7a4a",
                      fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
                    {on?"✓ ":""}{label}
                  </button>
                );
              })}
            </div>
            {/* $ per point */}
            {[["Vegas","vegas",vegasVal,setVegasVal],["Cut Throat","ct",ctVal,setCtVal],["Banker","p3",p3Val,setP3Val]].map(([label,key,val,setter]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, opacity: games[key]?1:0.35, pointerEvents: games[key]?"auto":"none" }}>
                <span style={{ fontSize: 14, color: "#ccc", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", background: "#071507", border: "1px solid #1e3a1e", borderRadius: 10, overflow: "hidden" }}>
                  <button className="pm-btn" onClick={() => setter(v => Math.max(1,v-1))} style={S.pmBtnInline}>−</button>
                  <span style={{ width: 42, textAlign: "center", color: COLORS[0], fontSize: 17, fontWeight: "700" }}>${val}</span>
                  <button className="pm-btn" onClick={() => setter(v => v+1)} style={S.pmBtnInline}>+</button>
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #1e3a1e", paddingTop: 10, marginTop: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: "#ccc", fontFamily: "'DM Sans', sans-serif" }}>HCP adjustment</span>
                <div style={{ display: "flex", alignItems: "center", background: "#071507", border: "1px solid #1e3a1e", borderRadius: 10, overflow: "hidden" }}>
                  <button className="pm-btn" onClick={() => setHcpThreshold(v => Math.max(1,v-1))} style={S.pmBtnInline}>−</button>
                  <span style={{ width: 42, textAlign: "center", color: COLORS[0], fontSize: 17, fontWeight: "700" }}>${hcpThreshold}</span>
                  <button className="pm-btn" onClick={() => setHcpThreshold(v => v+1)} style={S.pmBtnInline}>+</button>
                </div>
              </div>
            </div>
          </CollapseSect>

          {/* ── Recent Rounds — collapsible ── */}
          {savedRounds.length > 0 && (
            <CollapseSect title={`Recent Rounds (${savedRounds.length})`} open={activeSection==="history"} onToggle={() => setActiveSection(s => s==="history" ? null : "history")}>
              {savedRounds.map((round) => (
                <div key={round.savedAt} style={{ background: "#071507", border: "1px solid #1e3a1e", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: "600", color: "#e8f5e8", fontFamily: "'DM Sans', sans-serif" }}>{round.courseName || "Round"}</div>
                      <div style={{ fontSize: 11, color: "#4a7a4a", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{round.date}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => exportRound(round)}
                        style={{ padding: "6px 12px", background: "transparent", border: "1px solid #2a5a2a", borderRadius: 6, color: COLORS[0], cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                        ↑ Export
                      </button>
                      <button onClick={() => onLoadRound(round)}
                        style={{ padding: "6px 12px", background: COLORS[0]+"22", border: `1px solid ${COLORS[0]}`, borderRadius: 6, color: COLORS[0], cursor: "pointer", fontSize: 12, fontWeight: "600", fontFamily: "'DM Sans', sans-serif" }}>
                        Resume
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                    {round.config.names.map((name, pi) => {
                      const cfg = round.config;
                      const ss = cfg._savedState;
                      if (!ss) return null;
                      const vCum=[0,0,0,0],cCum=[0,0,0,0],pCum=[0,0,0,0];
                      cfg.holes.forEach((h,hi) => {
                        if (!ss.inPlay[hi]) return;
                        const g=ss.gross[hi];
                        const n=[0,1,2,3].map(p=>nettScore(g[p],ss.liveHcps[p],h.si,h.par));
                        if(cfg.games.vegas){const vr=computeVegas(ss.vTeams[hi],g,n,h.par);if(vr){ss.vTeams[hi][0].forEach(p=>{vCum[p]+=vr.netA;});ss.vTeams[hi][1].forEach(p=>{vCum[p]+=vr.netB;});}}
                        if(cfg.games.ct){const ct=computeCutThroat(n);[0,1,2,3].forEach(p=>cCum[p]+=ct[p]);}
                        if(cfg.games.p3&&h.par===3){const p3=computePar3(n,ss.banker[hi],ss.p3mult[hi]);[0,1,2,3].forEach(p=>pCum[p]+=p3[p]);}
                      });
                      const d=(cfg.games.vegas?vCum[pi]*cfg.vegasVal:0)+(cfg.games.ct?cCum[pi]*cfg.ctVal:0)+(cfg.games.p3?pCum[pi]*cfg.p3Val:0)+(ss.adjustments[pi]||0);
                      return (
                        <div key={pi} style={{ textAlign: "center", background: "#0d2210", borderRadius: 6, padding: "6px 4px" }}>
                          <div style={{ fontSize: 10, color: COLORS[pi], fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>{name.slice(0,5)}</div>
                          <div style={{ fontSize: 16, fontWeight: "700", color: d>0?COLORS[0]:d<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>{d>0?"+":""}{d}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CollapseSect>
          )}

          {/* ── Import ── */}
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
          <button onClick={() => importRef.current.click()}
            style={{ ...S.courseBtn, width: "100%", marginBottom: 4, textAlign: "center" }}>
            ↓ Import Round
          </button>

        </div>
      </div>

      {/* Sticky START button */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px 16px", background: "linear-gradient(0deg, #0a1a0a 70%, transparent)", maxWidth: 480, margin: "0 auto" }}>
        <button className="start-btn"
          style={{ ...S.startBtn, fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, padding: "18px" }}
          onClick={() => onStart({ names: names.map((n,i) => n.trim()||`Player ${i+1}`), hcps, holes, vegasVal, ctVal, p3Val, hcpThreshold, games, courseName: loadedCourse ? `${loadedCourse.name} — ${loadedCourse.tee}` : "Custom Course" })}>
          START ROUND →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORECARD
// ─────────────────────────────────────────────────────────────────────────────
function Scorecard({ config, onBack, onSave }) {
  const { names, hcps, holes, vegasVal, ctVal, p3Val, hcpThreshold, games } = config;
  const saved = config._savedState;
  // Stable ID for this round — used to upsert instead of creating duplicate saves
  const roundId = React.useRef(config._roundId || Date.now()).current;
  const [gross, setGross] = useState(() => saved?.gross || Array.from({length:18}, (_, hi) => Array(4).fill(String(holes[hi].par))));
  const [vTeams, setVTeams] = useState(() => saved?.vTeams || Array.from({length:18}, () => [[0,1],[2,3]]));
  const [banker, setBanker] = useState(() => saved?.banker || Array(18).fill(0));
  const [p3mult, setP3mult] = useState(() => saved?.p3mult || Array.from({length:18}, () => [1,1,1,1]));
  const [holeIdx, setHoleIdx] = useState(saved?.holeIdx || 0);
  const [inPlay, setInPlay] = useState(() => saved?.inPlay || Array(18).fill(false));
  const [roundStartTime, setRoundStartTime] = useState(() => saved?.roundStartTime || null);
  const [liveHcps, setLiveHcps] = useState(() => saved?.liveHcps || [...hcps]);
  const [view, setView] = useState("hole");
  const [confirmBack, setConfirmBack] = useState(false);
  const [adjustments, setAdjustments] = useState(saved?.adjustments || [0,0,0,0]);
  const [saveMsg, setSaveMsg] = useState("");

  // Swipe support
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = useCallback(e => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(e => {
    if (touchStartX.current === null || view !== "hole") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Swipe horizontally anywhere on screen to navigate holes
    // Only trigger if horizontal movement is dominant and exceeds 60px threshold
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 60) {
      if (dx < 0 && holeIdx < 17) { haptic("medium"); setHoleIdx(h => h + 1); }
      if (dx > 0 && holeIdx > 0) { haptic("medium"); setHoleIdx(h => h - 1); }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [view, holeIdx]);

  function setScore(hi, pi, val) {
    setGross(prev => {
      const n = prev.map(r => [...r]);
      n[hi][pi] = val;
      // Auto mark hole as In Play and save
      setInPlay(prevInPlay => {
        const updatedInPlay = [...prevInPlay];
        updatedInPlay[hi] = true;
        setTimeout(() => {
          onSave({
            roundId,
            config: { ...config, _roundId: roundId, _savedState: { gross: n, vTeams, banker, p3mult, holeIdx, inPlay: updatedInPlay, liveHcps, adjustments } },
            date: new Date().toLocaleDateString("en-SG", { day:"numeric", month:"short", year:"numeric" }),
            courseName: config.courseName || "Round",
          });
        }, 0);
        return updatedInPlay;
      });
      return n;
    });
  }
  function setVTeam(hi, side, players) {
    setVTeams(prev => { const n=prev.map(r=>[r[0].slice(),r[1].slice()]); n[hi][side]=players; return n; });
  }
  function toggleMult(hi, pi) {
    setP3mult(prev => { const n=JSON.parse(JSON.stringify(prev)); n[hi][pi]=n[hi][pi]===1?2:n[hi][pi]===2?3:1; return n; });
  }

  const results = holes.map((h, hi) => {
    const g = gross[hi];
    const n = [0,1,2,3].map(pi => nettScore(g[pi], liveHcps[pi], h.si, h.par));
    const vr = games.vegas ? computeVegas(vTeams[hi], g, n, h.par) : null;
    const vd = [0,0,0,0];
    if (vr) { vTeams[hi][0].forEach(pi => { vd[pi]=vr.netA; }); vTeams[hi][1].forEach(pi => { vd[pi]=vr.netB; }); }
    const ct = games.ct ? computeCutThroat(n) : [0,0,0,0];
    const p3 = (games.p3 && h.par===3) ? computePar3(n, banker[hi], p3mult[hi]) : [0,0,0,0];
    return { g, n, vr, vd, ct, p3 };
  });

  const vegasCum=[0,0,0,0], ctCum=[0,0,0,0], p3Cum=[0,0,0,0];
  results.forEach((r, hi) => {
    if (!inPlay[hi]) return;
    [0,1,2,3].forEach(pi => { vegasCum[pi]+=r.vd[pi]; ctCum[pi]+=r.ct[pi]; p3Cum[pi]+=r.p3[pi]; });
  });
  const dollars = [0,1,2,3].map(pi =>
    (games.vegas?vegasCum[pi]*vegasVal:0) +
    (games.ct?ctCum[pi]*ctVal:0) +
    (games.p3?p3Cum[pi]*p3Val:0) +
    adjustments[pi]);

  const h = holes[holeIdx];
  const res = results[holeIdx];
  const completedCount = inPlay.filter(Boolean).length;

  // Running gross total vs par through in-play holes
  const runningTotal = [0,1,2,3].map(pi => {
    let strokes = 0, par = 0;
    results.forEach((r, hi) => {
      if (!inPlay[hi]) return;
      const g = parseInt(r.g[pi], 10);
      if (!isNaN(g)) { strokes += g; par += holes[hi].par; }
    });
    return strokes === 0 ? null : strokes - par;
  });

  return (
    <div style={S.page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html { overscroll-behavior: none; overscroll-behavior-y: none; height: 100%; }
        body { overscroll-behavior: none; overscroll-behavior-y: none; height: 100%; margin: 0; }
        #root { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: none; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .pm-btn:active { transform: scale(0.9) !important; background: #2a5a2a !important; }
        .tab-btn:active { opacity: 0.7; }
        .hole-nav:active { transform: scale(0.95); background: #1e3a1e !important; }
        .score-btn:active { transform: scale(0.88); background: #2a5a2a !important; }
        select { appearance: none; -webkit-appearance: none; }
        @keyframes scoreIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .score-in { animation: scoreIn 0.15s ease-out; }
      `}</style>

      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#0d2210", borderBottom: "1px solid #1e3a1e" }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: "#1e3a1e" }}>
          <div style={{ height: "100%", width: `${(completedCount/18)*100}%`, background: COLORS[0], transition: "width 0.4s ease" }} />
        </div>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: "#4a7a4a", letterSpacing: 2 }}>HOLE</span>
            <select value={holeIdx} style={{ ...S.sel, fontSize: 22, fontWeight: "bold", color: "#e8f5e8", padding: "2px 8px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}
              onChange={e => setHoleIdx(Number(e.target.value))}>
              {Array.from({length:18}, (_,i) => (
                <option key={i} value={i}>{i+1}{inPlay[i] ? " ✓" : ""}</option>
              ))}
            </select>
            <div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6b9e6b" }}>Par {h.par}</span>
              <span style={{ fontSize: 13, color: "#6b9e6b", marginLeft: 6, fontWeight: "600" }}>SI {h.si}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {[["hole","HOLE"],["totals","$"],["setup","⚙"]].map(([v,label]) => (
              <button key={v} className="tab-btn" onClick={() => setView(v)}
                style={{
                  padding: v==="totals" ? "8px 18px" : "6px 10px",
                  borderRadius: 6,
                  fontSize: v==="totals" ? 20 : v==="setup" ? 16 : 11,
                  letterSpacing: v==="setup" ? 0 : 1,
                  cursor: "pointer", transition: "all 0.15s",
                  border: `1px solid ${view===v ? COLORS[0] : "#1e3a1e"}`,
                  background: view===v ? COLORS[0] : "transparent",
                  color: view===v ? "#0a1a0a" : "#4a7a4a",
                  fontWeight: view===v ? "bold" : "normal" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Hole progress dots */}
        {view === "hole" && (
          <div style={{ display: "flex", gap: 3, padding: "0 14px 6px", overflowX: "auto" }}>
            {Array.from({length:18}, (_,i) => (
              <div key={i} onClick={() => setHoleIdx(i)}
                style={{ width: i===holeIdx?24:8, height: 8, borderRadius: 4, flexShrink: 0, cursor: "pointer", transition: "all 0.2s",
                  background: i===holeIdx ? COLORS[0] : inPlay[i] ? "#2a5a2a" : "#1e3a1e" }} />
            ))}
          </div>
        )}
        {/* Running totals row */}
        {view === "hole" && completedCount > 0 && (
          <div style={{ display: "flex", gap: 4, padding: "0 14px 8px", justifyContent: "flex-end" }}>
            {[0,1,2,3].map(pi => {
              const t = runningTotal[pi];
              if (t === null) return null;
              const col = t < 0 ? COLORS[0] : t === 0 ? "#60a5fa" : "#f87171";
              return (
                <div key={pi} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS[pi] }} />
                  <span style={{ fontSize: 11, color: col, fontFamily: "'DM Sans', sans-serif", fontWeight: "600" }}>
                    {t > 0 ? "+" : ""}{t}
                  </span>
                </div>
              );
            })}
            <span style={{ fontSize: 10, color: "#3a6a3a", fontFamily: "'DM Sans', sans-serif", marginLeft: 2 }}>
              thru {completedCount}
            </span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 14px 160px" }}>
        {view === "setup" && (
          <>
            <Sect title="Handicaps">
              {[0,1,2,3].map(pi => (
                <div key={pi} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ ...S.dot, background: COLORS[pi] }}>{names[pi][0]}</div>
                  <span style={{ flex: 1, fontSize: 16, color: COLORS[pi], fontFamily: "'DM Sans', sans-serif", fontWeight: "500" }}>{names[pi]}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#071507", border: "1px solid #1e3a1e", borderRadius: 10, overflow: "hidden" }}>
                    <button className="pm-btn" onClick={() => { const n=[...liveHcps]; n[pi]=Math.max(0,n[pi]-1); setLiveHcps(n); }} style={S.pmBtnInline}>−</button>
                    <span style={{ width: 36, textAlign: "center", color: "#e8f5e8", fontSize: 18, fontWeight: "700" }}>{liveHcps[pi]}</span>
                    <button className="pm-btn" onClick={() => { const n=[...liveHcps]; n[pi]=Math.min(36,n[pi]+1); setLiveHcps(n); }} style={S.pmBtnInline}>+</button>
                  </div>
                </div>
              ))}
            </Sect>
            <div style={{ borderTop: "1px solid #1e3a1e", paddingTop: 16, marginTop: 8 }}>
              {!confirmBack ? (
                <button style={{ ...S.startBtn, background: "#3a1a1a", color: "#f87171", border: "1px solid #5a2a2a" }}
                  onClick={() => setConfirmBack(true)}>← Back to Setup</button>
              ) : (
                <div style={{ background: "#3a1a1a", border: "1px solid #f87171", borderRadius: 10, padding: 16 }}>
                  <div style={{ color: "#f87171", fontSize: 14, marginBottom: 12 }}>⚠️ All scores will be lost!</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.startBtn, background: "#f87171", color: "#fff", fontSize: 15, flex: 1 }} onClick={onBack}>Yes, go back</button>
                    <button style={{ ...S.startBtn, background: "#1e3a1e", color: COLORS[0], fontSize: 15, flex: 1 }} onClick={() => setConfirmBack(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view !== "setup" && (view === "hole" ? (
          <>
            {/* Score entry — large touch targets */}
            <Sect title="Gross Scores">
              {/* Player names row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                {[0,1,2,3].map(pi => (
                  <div key={pi} style={{ textAlign: "center" }}>
                    <div style={{ color: COLORS[pi], fontWeight: "600", fontSize: 14, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{names[pi]}</div>
                    {(() => {
                      const strokes = strokesGiven(liveHcps[pi], h.si);
                      const strokeColor = strokes === 2 ? COLORS[0] : strokes === 1 ? "#6ab87a" : "#3a5a3a";
                      const strokeWeight = strokes > 0 ? "600" : "400";
                      return (
                        <div style={{ fontSize: 10, color: "#3a5a3a" }}>
                          HCP {liveHcps[pi]}
                          <span style={{ color: strokeColor, fontWeight: strokeWeight, marginLeft: 4 }}>
                            {strokes > 0 ? `+${strokes} ●` : "·"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
              {/* Big score buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
                {[0,1,2,3].map(pi => {
                  const g = parseInt(gross[holeIdx][pi], 10) || h.par;
                  const grossDiff = g - h.par;
                  return (
                    <div key={pi} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <button className="score-btn" onClick={() => { const next=g+1; const par=holes[holeIdx].par; if(next >= par+5 || next <= par-2) { haptic("strong"); window.navigator?.vibrate?.([30,20,30]); } else { haptic(); } setScore(holeIdx, pi, String(next)); }}
                        style={{ width: "100%", height: 44, borderRadius: 8, background: "#1a3a1a", border: "1px solid #2a5a2a", color: COLORS[0], fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>+</button>
                      <ScoreBadge score={g} diff={grossDiff} large />
                      <button className="score-btn" onClick={() => { const next=Math.max(1,g-1); const par=holes[holeIdx].par; if(next >= par+5 || next <= par-2) { haptic("strong"); window.navigator?.vibrate?.([30,20,30]); } else { haptic(); } setScore(holeIdx, pi, String(next)); }}
                        style={{ width: "100%", height: 44, borderRadius: 8, background: "#1a3a1a", border: "1px solid #2a5a2a", color: COLORS[0], fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>−</button>
                    </div>
                  );
                })}
              </div>
              {/* Nett scores */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {[0,1,2,3].map(pi => {
                  const n = res.n[pi];
                  const nettDiff = n !== null ? n - h.par : null;
                  return (
                    <div key={pi} style={{ textAlign: "center", background: "#071507", borderRadius: 6, padding: "4px 4px 6px", border: "1px solid #1e3a1e" }}>
                      <div style={{ fontSize: 10, color: "#4a7a4a", marginBottom: 2 }}>NETT</div>
                      {n !== null ? <ScoreBadge score={n} diff={nettDiff} /> : <div style={{ fontSize: 18, color: "#2a4a2a" }}>—</div>}
                    </div>
                  );
                })}
              </div>
            </Sect>

            {/* In Play toggle — moved here, auto-saves on toggle */}
            <InPlayToggle on={inPlay[holeIdx]} onToggle={() => {
              setInPlay(prev => {
                const n = [...prev]; n[holeIdx] = !n[holeIdx];
                // Auto-save: build updated state and trigger save
                const updatedInPlay = n;
                setTimeout(() => {
                  onSave({
                    roundId,
                    config: { ...config, _roundId: roundId, _savedState: { gross, vTeams, banker, p3mult, holeIdx, inPlay: updatedInPlay, liveHcps, adjustments } },
                    date: new Date().toLocaleDateString("en-SG", { day:"numeric", month:"short", year:"numeric" }),
                    courseName: config.courseName || "Round",
                  });
                }, 0);
                return n;
              });
            }} />

            {/* Vegas */}
            {games.vegas && <Sect title="Vegas — Teams">
              <div style={{ fontSize: 12, color: "#4a7a4a", marginBottom: 8 }}>
                Pick <span style={{ color: COLORS[0], fontWeight: "600" }}>{names[0]}</span>'s partner
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[1,2,3].map(pi => {
                  const isPartner = vTeams[holeIdx][0].includes(pi);
                  return (
                    <button key={pi} style={{ flex: 1, padding: "14px 0", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: isPartner?"bold":"normal",
                      border: `1px solid ${isPartner ? COLORS[pi] : "#1e3a1e"}`,
                      background: isPartner ? COLORS[pi]+"33" : "transparent",
                      color: isPartner ? COLORS[pi] : "#4a7a4a", transition: "all 0.15s",
                      fontFamily: "'DM Sans', sans-serif" }}
                      onClick={() => { const others=[1,2,3].filter(x=>x!==pi); setVTeam(holeIdx,0,[0,pi]); setVTeam(holeIdx,1,others); }}>
                      {names[pi]}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "#4a7a4a", marginBottom: 8 }}>
                <span style={{ color: COLORS[0] }}>{names[0]}</span>+<span style={{ color: COLORS[vTeams[holeIdx][0][1]] }}>{names[vTeams[holeIdx][0][1]]}</span>
                {" "}<span style={{ color: "#2a4a2a" }}>vs</span>{" "}
                <span style={{ color: COLORS[vTeams[holeIdx][1][0]] }}>{names[vTeams[holeIdx][1][0]]}</span>+<span style={{ color: COLORS[vTeams[holeIdx][1][1]] }}>{names[vTeams[holeIdx][1][1]]}</span>
              </div>
              {res.vr && (() => {
                const r = res.vr;
                const t0=vTeams[holeIdx][0], t1=vTeams[holeIdx][1];
                const t0name=t0.map(i=>names[i]).join(" + "), t1name=t1.map(i=>names[i]).join(" + ");
                const winnerIsA = r.tied ? r.grossWinnerIsA : r.effA < r.effB;
                const tied = r.tied && r.bonusA === 0 && r.bonusB === 0;
                const winnerName = winnerIsA != null ? (winnerIsA ? t0name : t1name) : null;
                const loserName  = winnerIsA != null ? (winnerIsA ? t1name : t0name) : null;

                const StepRow = ({ label, children }) => (
                  <div style={{ borderBottom: "1px solid #0d2210", padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: 2, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
                    {children}
                  </div>
                );
                const NumBadge = ({ val, flipped, winner }) => (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: "700", lineHeight: 1,
                      color: flipped ? "#f97316" : winner ? COLORS[0] : "#e8f5e8",
                      fontFamily: "'Bebas Neue', sans-serif" }}>{val}</div>
                    {flipped && <div style={{ fontSize: 10, color: "#f97316", marginTop: 2 }}>FLIPPED</div>}
                    {winner && !flipped && <div style={{ fontSize: 10, color: COLORS[0], marginTop: 2 }}>WINNER</div>}
                  </div>
                );

                return (
                  <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>

                    {/* Step 1 — Vegas numbers */}
                    <StepRow label="STEP 1 — VEGAS NUMBERS (lo digit first)">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "#5a8a5a", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{t0name}</div>
                          <div style={{ fontSize: 36, fontWeight: "700", color: "#e8f5e8", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>{r.vA}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 13, color: r.tied ? "#60a5fa" : "#3a6a3a", fontFamily: "'DM Sans', sans-serif", fontWeight: r.tied ? "700" : "400" }}>{r.tied ? "TIED" : "vs"}</div>
                          {r.tied && <div style={{ fontSize: 10, color: "#60a5fa", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>check gross</div>}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "#5a8a5a", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{t1name}</div>
                          <div style={{ fontSize: 36, fontWeight: "700", color: "#e8f5e8", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>{r.vB}</div>
                        </div>
                      </div>
                    </StepRow>
                    {/* Step 2 — Gross tiebreak (only on nett tie with bonus) */}
                    {r.tied && (r.bonusA > 0 || r.bonusB > 0) && (
                      <StepRow label="STEP 2 — GROSS VEGAS TIEBREAK (bonus only)">
                        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                          Nett tied — using gross Vegas numbers to award bonus
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "#5a8a5a", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{t0name}</div>
                            <div style={{ fontSize: 28, fontWeight: "700", color: r.grossWinnerIsA ? COLORS[0] : "#e8f5e8", fontFamily: "'Bebas Neue', sans-serif" }}>
                              {vegasNum(parseInt(res.g[t0[0]],10), parseInt(res.g[t0[1]],10))}
                            </div>
                            {r.grossWinnerIsA && <div style={{ fontSize: 10, color: COLORS[0], marginTop: 2 }}>WINS BONUS</div>}
                          </div>
                          <div style={{ fontSize: 13, color: "#3a6a3a" }}>vs</div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "#5a8a5a", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{t1name}</div>
                            <div style={{ fontSize: 28, fontWeight: "700", color: !r.grossWinnerIsA ? COLORS[0] : "#e8f5e8", fontFamily: "'Bebas Neue', sans-serif" }}>
                              {vegasNum(parseInt(res.g[t1[0]],10), parseInt(res.g[t1[1]],10))}
                            </div>
                            {!r.grossWinnerIsA && <div style={{ fontSize: 10, color: COLORS[0], marginTop: 2 }}>WINS BONUS</div>}
                          </div>
                        </div>
                      </StepRow>
                    )}

                    {/* Step 3 — Flip (only if applicable) */}
                    {(r.flipA || r.flipB) && (
                      <StepRow label="STEP 2 — FLIP (winning team flips loser's number)">
                        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                          {winnerName} triggered a flip
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                          <NumBadge val={r.effA} flipped={r.flipA} winner={winnerIsA && !r.flipA} />
                          <div style={{ fontSize: 13, color: "#3a6a3a" }}>vs</div>
                          <NumBadge val={r.effB} flipped={r.flipB} winner={!winnerIsA && !r.flipB} />
                        </div>
                      </StepRow>
                    )}

                    {/* Step 3 or 4 — Difference & multiplier */}
                    {!tied && (
                      <StepRow label={`STEP ${r.flipA || r.flipB ? "3" : "2"} — DIFFERENCE${r.mult > 1 ? " × MULTIPLIER" : ""}`}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, color: "#aaa", fontFamily: "'DM Sans', sans-serif" }}>
                            |{r.effA} − {r.effB}| = <span style={{ color: "#e8f5e8", fontWeight: "700" }}>{Math.abs(r.effA - r.effB)}</span>
                          </span>
                          {r.mult > 1 && (
                            <span style={{ fontSize: 14, color: "#e879f9", fontWeight: "700", fontFamily: "'DM Sans', sans-serif" }}>
                              × {r.mult} = <span style={{ color: "#e8f5e8" }}>{Math.abs(r.effA - r.effB) * r.mult} pts</span>
                            </span>
                          )}
                          {r.mult === 1 && (
                            <span style={{ fontSize: 14, color: COLORS[0], fontFamily: "'DM Sans', sans-serif" }}>
                              = <strong>{Math.abs(r.effA - r.effB)} pts</strong>
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: COLORS[0], fontFamily: "'DM Sans', sans-serif" }}>
                          🏆 {winnerName} wins {Math.abs(r.effA - r.effB) * r.mult} pt{Math.abs(r.effA - r.effB) * r.mult !== 1 ? "s" : ""}
                        </div>
                      </StepRow>
                    )}

                    {/* Bonus step */}
                    {(r.bonusA > 0 || r.bonusB > 0) && (
                      <StepRow label={r.tied ? "STEP 3 — BONUS" : `STEP ${r.flipA || r.flipB ? "4" : "3"} — BONUS`}>
                        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
                          {r.bonusA > 0
                            ? `${t0name} earned a +${r.bonusA} pt bonus`
                            : `${t1name} earned a +${r.bonusB} pt bonus`}
                        </div>
                      </StepRow>
                    )}

                    {/* Final result */}
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#4a7a4a", letterSpacing: 2, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                        {tied ? "RESULT — TIED" : r.tied ? "RESULT — NETT TIED (BONUS ONLY)" : "RESULT"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                        {[0,1,2,3].map(pi => {
                          const v = res.vd[pi];
                          return (
                            <div key={pi} style={{ background: "#0d2210", borderRadius: 6, padding: "8px 4px", textAlign: "center", border: `1px solid ${v>0?"#2a5a2a":v<0?"#5a2a2a":"#1e3a1e"}` }}>
                              <div style={{ fontSize: 11, color: COLORS[pi], marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}>{names[pi]}</div>
                              <div style={{ fontSize: 22, fontWeight: "700", color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontFamily: "'Bebas Neue', sans-serif" }}>
                                {v > 0 ? "+" : ""}{v}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </Sect>

            }

            {/* Banker */}
            {games.p3 && h.par === 3 && (
              <Sect title="Banker">
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#4a7a4a", marginBottom: 8 }}>Banker</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0,1,2,3].map(pi => (
                      <button key={pi} style={{ flex: 1, padding: "12px 0", borderRadius: 8, cursor: "pointer", fontSize: 13,
                        border: `1px solid ${banker[holeIdx]===pi?COLORS[pi]:"#1e3a1e"}`,
                        background: banker[holeIdx]===pi?COLORS[pi]+"33":"transparent",
                        color: banker[holeIdx]===pi?COLORS[pi]:"#4a7a4a",
                        fontFamily: "'DM Sans', sans-serif" }}
                        onClick={() => { setBanker(prev => { const n=[...prev]; n[holeIdx]=pi; return n; }); setP3mult(prev => { const n=JSON.parse(JSON.stringify(prev)); n[holeIdx]=[1,1,1,1]; return n; }); }}>
                        {names[pi]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#4a7a4a", marginBottom: 8 }}>Multipliers (tap to cycle 1→2→3)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0,1,2,3].map(pi => (
                      <button key={pi} style={{ flex: 1, padding: "12px 0", borderRadius: 8, cursor: "pointer", fontSize: 13,
                        border: `1px solid ${p3mult[holeIdx][pi]>1?COLORS[pi]:"#1e3a1e"}`,
                        background: p3mult[holeIdx][pi]>1?COLORS[pi]+"22":"transparent",
                        color: p3mult[holeIdx][pi]>1?COLORS[pi]:"#4a7a4a",
                        fontFamily: "'DM Sans', sans-serif" }}
                        onClick={() => toggleMult(holeIdx, pi)}>
                        {names[pi]} ×{p3mult[holeIdx][pi]}
                      </button>
                    ))}
                  </div>
                </div>
              </Sect>
            )}

            {/* Points this hole */}
            <Sect title={`Hole ${holeIdx+1} Points`}>
              <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: `100px repeat(4, 1fr)`, borderBottom: "1px solid #1e3a1e" }}>
                  <div style={{ padding: "8px 10px" }} />
                  {[0,1,2,3].map(pi => (
                    <div key={pi} style={{ padding: "8px 4px", textAlign: "center", fontSize: 12, color: COLORS[pi], fontWeight: "600", fontFamily: "'DM Sans', sans-serif" }}>{names[pi]}</div>
                  ))}
                </div>
                {/* Vegas row */}
                {games.vegas && (
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(4, 1fr)`, borderBottom: "1px solid #0d2210" }}>
                    <div style={{ padding: "8px 10px", fontSize: 12, color: "#5a8a5a", display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>Vegas</div>
                    {[0,1,2,3].map(pi => {
                      const v = res.vd[pi];
                      return <div key={pi} style={{ padding: "8px 4px", textAlign: "center", fontSize: 15, fontWeight: "600", color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>{v>0?"+":""}{v}</div>;
                    })}
                  </div>
                )}
                {/* Cut Throat row */}
                {games.ct && (
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(4, 1fr)`, borderBottom: (games.p3 && h.par===3)?"1px solid #0d2210":"none" }}>
                    <div style={{ padding: "8px 10px", fontSize: 12, color: "#5a8a5a", display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>Cut Throat</div>
                    {[0,1,2,3].map(pi => {
                      const v = res.ct[pi];
                      return <div key={pi} style={{ padding: "8px 4px", textAlign: "center", fontSize: 15, fontWeight: "600", color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>{v>0?"+":""}{v}</div>;
                    })}
                  </div>
                )}
                {/* Banker row — only on par 3s */}
                {games.p3 && h.par === 3 && (
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(4, 1fr)` }}>
                    <div style={{ padding: "8px 10px", fontSize: 12, color: "#5a8a5a", display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>Banker</div>
                    {[0,1,2,3].map(pi => {
                      const v = res.p3[pi];
                      return <div key={pi} style={{ padding: "8px 4px", textAlign: "center", fontSize: 15, fontWeight: "600", color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>{v>0?"+":""}{v}</div>;
                    })}
                  </div>
                )}
              </div>
            </Sect>
          </>
        ) : (
          <TotalsView names={names} results={results} holes={holes} vTeams={vTeams}
            vegasCum={vegasCum} ctCum={ctCum} p3Cum={p3Cum} dollars={dollars}
            vegasVal={vegasVal} ctVal={ctVal} p3Val={p3Val} inPlay={inPlay}
            adjustments={adjustments} setAdjustments={setAdjustments}
            liveHcps={liveHcps} hcpThreshold={hcpThreshold} games={games}
            saveMsg={saveMsg}
            onSave={() => {
              const roundData = {
                roundId,
                config: { ...config, _roundId: roundId, _savedState: { gross, vTeams, banker, p3mult, holeIdx, inPlay, liveHcps, adjustments } },
                date: new Date().toLocaleDateString("en-SG", { day:"numeric", month:"short", year:"numeric" }),
                courseName: config.courseName || "Round",
                savedAt: Date.now(),
              };
              onSave(roundData);
              setSaveMsg("Round saved ✓");
              setTimeout(() => setSaveMsg(""), 2500);
            }}
            onExport={() => {
              const roundData = {
                roundId,
                config: { ...config, _roundId: roundId, _savedState: { gross, vTeams, banker, p3mult, holeIdx, inPlay, liveHcps, adjustments } },
                date: new Date().toLocaleDateString("en-SG", { day:"numeric", month:"short", year:"numeric" }),
                courseName: config.courseName || "Round",
                savedAt: Date.now(),
              };
              exportRound(roundData);
            }}
            onReport={() => generateReport({ names, holes, liveHcps, inPlay, results, dollars, vegasCum, ctCum, p3Cum, vegasVal, ctVal, p3Val, adjustments, games, courseName: config.courseName, roundStartTime })}
            onHole={hi => { setHoleIdx(hi); setView("hole"); }} />
        ))}
      </div>

      {/* Sticky bottom nav — only on hole view */}
      {view === "hole" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a1a0a", borderTop: "1px solid #1e3a1e", padding: "10px 16px 10px", display: "flex", gap: 10, maxWidth: 480, margin: "0 auto" }}>
          <button className="hole-nav"
            disabled={holeIdx===0}
            onClick={() => setHoleIdx(h=>h-1)}
            style={{ flex: 1, padding: "14px", background: "#0d2210", color: holeIdx===0?"#2a4a2a":COLORS[0], border: `1px solid ${holeIdx===0?"#1e3a1e":"#2a5a2a"}`, borderRadius: 10, cursor: holeIdx===0?"default":"pointer", fontSize: 15, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, transition: "all 0.15s" }}>
            ← PREV
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 60 }}>
            <div style={{ fontSize: 10, color: "#3a6a3a", fontFamily: "'DM Sans', sans-serif" }}>{completedCount}/18</div>
            <div style={{ fontSize: 11, color: "#5a8a5a", fontFamily: "'DM Sans', sans-serif" }}>played</div>
          </div>
          <button className="hole-nav"
            disabled={holeIdx===17}
            onClick={() => setHoleIdx(h=>h+1)}
            style={{ flex: 1, padding: "14px", background: "#1e3a1e", color: holeIdx===17?"#2a4a2a":COLORS[0], border: `1px solid ${holeIdx===17?"#1e3a1e":"#2a5a2a"}`, borderRadius: 10, cursor: holeIdx===17?"default":"pointer", fontSize: 15, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, transition: "all 0.15s" }}>
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTALS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TotalsView({ names, results, holes, vTeams, vegasCum, ctCum, p3Cum, dollars, vegasVal, ctVal, p3Val, inPlay, adjustments, setAdjustments, liveHcps, hcpThreshold, games, onSave, onExport, onReport, saveMsg, onHole }) {
  const [tab, setTab] = useState("board");
  const [showHcp, setShowHcp] = useState(false);
  const [showAdj, setShowAdj] = useState(false);

  const strokeAdj = [0,1,2,3].map(i => {
    const strokes = Math.floor(Math.abs(dollars[i]) / hcpThreshold);
    return dollars[i]>0 ? -strokes : dollars[i]<0 ? strokes : 0;
  });
  const adjHcps = [0,1,2,3].map(i => liveHcps[i] + strokeAdj[i]);
  const minHcp = Math.min(...adjHcps);
  const newRelHcps = adjHcps.map(h => h - minHcp);

  return (
    <>
      {/* Save + Export + Report buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={onSave} style={{ flex: 2, padding: "13px", background: "#0d2210", color: COLORS[0], border: "1px solid #2a5a2a", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: "600", fontFamily: "'DM Sans', sans-serif" }}>
          💾 Save
        </button>
        <button onClick={onExport} style={{ flex: 1, padding: "13px", background: "transparent", color: COLORS[0], border: "1px solid #2a5a2a", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
          ↑ Export
        </button>
        <button onClick={onReport} style={{ flex: 1, padding: "13px", background: "transparent", color: COLORS[0], border: "1px solid #2a5a2a", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
          📄 Report
        </button>
      </div>
      {saveMsg && <div style={{ textAlign: "center", fontSize: 12, color: COLORS[0], marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{saveMsg}</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["board","TOTALS"],["vegas","VEGAS"],["ct","CUT THROAT"],["par3","PAR 3"]].filter(([t]) => t==="board" || (t==="vegas"&&games.vegas) || (t==="ct"&&games.ct) || (t==="par3"&&games.p3)).map(([t,label]) => (
          <button key={t} className="tab-btn" onClick={() => setTab(t)}
            style={{ padding: "8px 12px", borderRadius: 6, fontSize: 11, letterSpacing: 1, cursor: "pointer",
              border: `1px solid ${tab===t?COLORS[0]:"#1e3a1e"}`,
              background: tab===t?COLORS[0]:"transparent",
              color: tab===t?"#0a1a0a":"#4a7a4a",
              fontWeight: tab===t?"bold":"normal",
              fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "board" && (
        <>
          {/* Breakdown table */}
          <Sect title="Totals">
            <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px repeat(4,1fr)", borderBottom: "1px solid #1e3a1e" }}>
                <div style={{ padding: "8px 10px", fontSize: 11, color: "#3a6a3a" }} />
                {[0,1,2,3].map(i => <div key={i} style={{ padding: "8px 4px", textAlign: "center", fontSize: 12, color: COLORS[i], fontWeight: "600", fontFamily: "'DM Sans', sans-serif" }}>{names[i]}</div>)}
              </div>
              {[["Vegas","vegas",vegasCum,vegasVal],["Cut Throat","ct",ctCum,ctVal],["Banker","p3",p3Cum,p3Val]].filter(([,key])=>games[key]).map(([label,,cum,val]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "80px repeat(4,1fr)", borderBottom: "1px solid #0d2210" }}>
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "#5a8a5a", display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
                  {[0,1,2,3].map(i => {
                    const v = cum[i]*val;
                    return <div key={i} style={{ padding: "8px 4px", textAlign: "center", fontSize: 14, fontWeight: "600", color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>{v>0?"+":""}{v||"—"}</div>;
                  })}
                </div>
              ))}
              {adjustments.some(a=>a!==0) && (
                <div style={{ display: "grid", gridTemplateColumns: "80px repeat(4,1fr)", borderBottom: "1px solid #0d2210" }}>
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "#5a8a5a", display: "flex", alignItems: "center" }}>Adj</div>
                  {[0,1,2,3].map(i => {
                    const v=adjustments[i];
                    return <div key={i} style={{ padding: "8px 4px", textAlign: "center", fontSize: 14, fontWeight: "600", color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a" }}>{v>0?"+":""}{v||"—"}</div>;
                  })}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "80px repeat(4,1fr)", background: "#0d2210" }}>
                <div style={{ padding: "10px 10px", fontSize: 12, color: "#e8f5e8", fontWeight: "700", display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>TOTAL</div>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ padding: "10px 4px", textAlign: "center", fontSize: 18, fontWeight: "700", color: dollars[i]>0?COLORS[0]:dollars[i]<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>
                    {dollars[i]>0?"+":""}{dollars[i]}
                  </div>
                ))}
              </div>
            </div>
          </Sect>

          <CollapseSect title={`Next Round HCP (@ $${hcpThreshold}/stroke)`} open={showHcp} onToggle={() => setShowHcp(v=>!v)}>
            <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>
              {[["Current HCP", liveHcps],["Adj", strokeAdj],["Adjusted", adjHcps],["New Rel HCP", newRelHcps]].map(([label, vals], ri) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "90px repeat(4,1fr)", borderBottom: ri<3?"1px solid #0d2210":"none", background: ri===3?"#0d2210":"transparent" }}>
                  <div style={{ padding: "8px 10px", fontSize: 11, color: ri===3?"#e8f5e8":"#5a8a5a", display: "flex", alignItems: "center", fontWeight: ri===3?"700":"400", fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ padding: "8px 4px", textAlign: "center", fontSize: 14, color: ri===3?"#e8f5e8":ri===1?(vals[i]>0?COLORS[0]:vals[i]<0?"#f87171":"#4a7a4a"):"#aaa", fontWeight: ri===3?"700":"400", fontFamily: "'DM Sans', sans-serif" }}>
                      {ri===1 && vals[i]>0 ? "+":""}{vals[i]}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CollapseSect>

          <CollapseSect title="Manual Adjustment ($)" open={showAdj} onToggle={() => setShowAdj(v=>!v)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[0,1,2,3].map(pi => (
                <div key={pi} style={{ textAlign: "center" }}>
                  <div style={{ color: COLORS[pi], fontWeight: "600", fontSize: 13, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{names[pi]}</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <button className="pm-btn" onClick={() => { const n=[...adjustments]; n[pi]+=1; setAdjustments(n); }} style={{ ...S.pmBtnLarge }}>+</button>
                    <div style={{ fontSize: 22, fontWeight: "700", color: adjustments[pi]>0?COLORS[0]:adjustments[pi]<0?"#f87171":"#4a7a4a", fontFamily: "'DM Sans', sans-serif" }}>
                      {adjustments[pi]>0?"+":""}{adjustments[pi]}
                    </div>
                    <button className="pm-btn" onClick={() => { const n=[...adjustments]; n[pi]-=1; setAdjustments(n); }} style={{ ...S.pmBtnLarge }}>−</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setAdjustments([0,0,0,0])} style={{ ...S.navBtn, width: "100%", marginTop: 12, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Reset Adjustments</button>
          </CollapseSect>

          {/* $ Over Round chart — bottom of totals */}
          {(() => {
            const cumData = [];
            const running = [0,0,0,0];
            for (let hi = 0; hi < 18; hi++) {
              if (!inPlay[hi]) continue;
              const r = results[hi];
              [0,1,2,3].forEach(pi => {
                running[pi] += (games.vegas?r.vd[pi]*vegasVal:0) + (games.ct?r.ct[pi]*ctVal:0) + (games.p3?r.p3[pi]*p3Val:0);
              });
              cumData.push({ hi, values: [...running] });
            }
            if (cumData.length < 2) return null;
            const allVals = cumData.flatMap(d => d.values);
            const minV = Math.min(0, ...allVals);
            const maxV = Math.max(0, ...allVals);
            const range = maxV - minV || 1;
            const chartH = 80;
            const zeroY = chartH * (maxV / range);
            const xStep = 20;
            return (
              <Sect title="$ Over Round">
                <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", padding: "12px 8px 8px", overflowX: "auto" }}>
                  <svg width="100%" viewBox={`0 0 ${cumData.length * xStep + 10} ${chartH + 20}`} style={{ display: "block", minWidth: 200 }}>
                    <line x1="5" y1={zeroY + 4} x2={cumData.length * xStep + 5} y2={zeroY + 4}
                      stroke="#1e3a1e" strokeWidth="0.8" strokeDasharray="3,3"/>
                    {[0,1,2,3].map(pi => {
                      const pts = cumData.map((d, idx) => {
                        const x = idx * xStep + 15;
                        const y = 4 + chartH * (1 - (d.values[pi] - minV) / range);
                        return `${x},${y}`;
                      }).join(" ");
                      return <polyline key={pi} points={pts} fill="none" stroke={COLORS[pi]} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round"/>;
                    })}
                    {[0,1,2,3].map(pi => {
                      const last = cumData[cumData.length - 1];
                      const x = (cumData.length - 1) * xStep + 15;
                      const y = 4 + chartH * (1 - (last.values[pi] - minV) / range);
                      return <circle key={pi} cx={x} cy={y} r="2.5" fill={COLORS[pi]}/>;
                    })}
                    {cumData.map((d, idx) => (
                      <text key={idx} x={idx * xStep + 15} y={chartH + 16}
                        textAnchor="middle" fontSize="8" fill="#3a6a3a" fontFamily="sans-serif">
                        {d.hi + 1}
                      </text>
                    ))}
                  </svg>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 4 }}>
                    {[0,1,2,3].map(pi => (
                      <div key={pi} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 12, height: 2, background: COLORS[pi], borderRadius: 1 }}/>
                        <span style={{ fontSize: 10, color: COLORS[pi], fontFamily: "'DM Sans', sans-serif" }}>{names[pi]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Sect>
            );
          })()}
        </>
      )}

            {tab === "vegas" && (
        <Sect title="Vegas — Hole by Hole">
          <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 60px 44px 24px repeat(4,1fr)", borderBottom: "1px solid #1e3a1e" }}>
              {["H","Teams","Nums","×",...names.map(n=>n.slice(0,3))].map((h,i) => (
                <div key={i} style={{ ...S.th, padding: "8px 4px", fontSize: 10, color: i>3?COLORS[i-4]:"#4a7a4a" }}>{h}</div>
              ))}
            </div>
            {results.map((r, hi) => {
              const active = inPlay[hi];
              return (
                <div key={hi} onClick={() => onHole(hi)} style={{ display: "grid", gridTemplateColumns: "28px 60px 44px 24px repeat(4,1fr)", borderBottom: "1px solid #0d2210", cursor: "pointer", opacity: active?1:0.35 }}>
                  <div style={S.td}>{hi+1}</div>
                  <div style={{ ...S.td, fontSize: 10 }}>{vTeams[hi][0].map(i=>names[i][0]).join("")}|{vTeams[hi][1].map(i=>names[i][0]).join("")}</div>
                  <div style={{ ...S.td, fontSize: 10 }}>{active&&r.vr?`${r.vr.effA}|${r.vr.effB}`:""}</div>
                  <div style={{ ...S.td, color: r.vr?.mult>1?"#e879f9":"#4a7a4a" }}>{active&&r.vr?.mult>1?`×${r.vr.mult}`:""}</div>
                  {[0,1,2,3].map(i => { const v=active?r.vd[i]:0; return <div key={i} style={{ ...S.td, color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontWeight: v!==0?"600":"400" }}>{v!==0?(v>0?"+":"")+v:"—"}</div>; })}
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "28px 60px 44px 24px repeat(4,1fr)", background: "#0d2210", borderTop: "1px solid #1e3a1e" }}>
              <div style={{ ...S.td, fontWeight: "700", fontSize: 11 }} colSpan={4}>TOT</div>
              <div style={S.td} /><div style={S.td} /><div style={S.td} />
              {vegasCum.map((v,i) => <div key={i} style={{ ...S.td, color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontWeight: "700" }}>{v>0?"+":""}{v||"—"}</div>)}
            </div>
          </div>
        </Sect>
      )}

      {tab === "ct" && (
        <Sect title="Cut Throat — Hole by Hole">
          <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 28px repeat(4,1fr)", borderBottom: "1px solid #1e3a1e" }}>
              {["H","Par",...names.map(n=>n.slice(0,3))].map((h,i) => (
                <div key={i} style={{ ...S.th, padding: "8px 4px", fontSize: 10, color: i>1?COLORS[i-2]:"#4a7a4a" }}>{h}</div>
              ))}
            </div>
            {results.map((r, hi) => {
              const active = inPlay[hi];
              return (
                <div key={hi} onClick={() => onHole(hi)} style={{ display: "grid", gridTemplateColumns: "28px 28px repeat(4,1fr)", borderBottom: "1px solid #0d2210", cursor: "pointer", opacity: active?1:0.35 }}>
                  <div style={S.td}>{hi+1}</div>
                  <div style={S.td}>{holes[hi].par}</div>
                  {[0,1,2,3].map(i => { const v=active?r.ct[i]:0; return <div key={i} style={{ ...S.td, color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontWeight: v!==0?"600":"400" }}>{v!==0?(v>0?"+":"")+v:"—"}</div>; })}
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "28px 28px repeat(4,1fr)", background: "#0d2210", borderTop: "1px solid #1e3a1e" }}>
              <div style={{ ...S.td, fontWeight: "700", fontSize: 11 }}>TOT</div>
              <div style={S.td} />
              {ctCum.map((v,i) => <div key={i} style={{ ...S.td, color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontWeight: "700" }}>{v>0?"+":""}{v||"—"}</div>)}
            </div>
          </div>
        </Sect>
      )}

      {tab === "par3" && (
        <Sect title="Banker — Hole by Hole">
          <div style={{ background: "#071507", borderRadius: 8, border: "1px solid #1e3a1e", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px repeat(4,1fr)", borderBottom: "1px solid #1e3a1e" }}>
              {["H",...names.map(n=>n.slice(0,3))].map((h,i) => (
                <div key={i} style={{ ...S.th, padding: "8px 4px", fontSize: 10, color: i>0?COLORS[i-1]:"#4a7a4a" }}>{h}</div>
              ))}
            </div>
            {results.map((r, hi) => {
              if (holes[hi].par !== 3) return null;
              const active = inPlay[hi];
              return (
                <div key={hi} onClick={() => onHole(hi)} style={{ display: "grid", gridTemplateColumns: "28px repeat(4,1fr)", borderBottom: "1px solid #0d2210", cursor: "pointer", opacity: active?1:0.35 }}>
                  <div style={S.td}>{hi+1}</div>
                  {[0,1,2,3].map(i => { const v=active?r.p3[i]:0; return <div key={i} style={{ ...S.td, color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontWeight: v!==0?"600":"400" }}>{v!==0?(v>0?"+":"")+v:"—"}</div>; })}
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "28px repeat(4,1fr)", background: "#0d2210", borderTop: "1px solid #1e3a1e" }}>
              <div style={{ ...S.td, fontWeight: "700", fontSize: 11 }}>TOT</div>
              {p3Cum.map((v,i) => <div key={i} style={{ ...S.td, color: v>0?COLORS[0]:v<0?"#f87171":"#4a7a4a", fontWeight: "700" }}>{v>0?"+":""}{v||"—"}</div>)}
            </div>
          </div>
        </Sect>
      )}

      {/* Full gross scorecard */}
      <Sect title="Scorecard (Gross)">
        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1e3a1e" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0d2210" }}>
                <th style={{ ...S.th, padding: "8px 6px" }}>H</th>
                <th style={{ ...S.th, padding: "8px 6px" }}>Par</th>
                <th style={{ ...S.th, padding: "8px 6px", color: "#3a6a3a" }}>SI</th>
                {[0,1,2,3].map(i => (
                  <th key={i} style={{ ...S.th, padding: "8px 6px", color: COLORS[i] }}>{names[i].slice(0,4)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0,1,2,3,4,5,6,7,8].map(row => {
                const active = inPlay[row];
                return (
                  <tr key={row} style={{ background: row%2===0?"#071507":"#060f06", opacity: active?1:0.4 }}>
                    <td style={{ ...S.td, color: active?"#5a8a5a":"#3a5a3a", fontWeight: "600" }}>{row+1}</td>
                    <td style={{ ...S.td, color: active?"#4a7a4a":"#2a4a2a" }}>{holes[row].par}</td>
                    <td style={{ ...S.td, color: "#8aaa8a", fontSize: 12 }}>{holes[row].si}</td>
                    {[0,1,2,3].map(pi => {
                      const g = parseInt(results[row].g[pi], 10);
                      const diff = isNaN(g) ? null : g - holes[row].par;
                      return (
                        <td key={pi} style={{ ...S.td, padding: "4px 2px" }}>
                          {diff !== null
                            ? active
                              ? <ScoreBadge score={g} diff={diff} />
                              : <span style={{ color: "#4a5a4a", fontSize: 13, fontWeight: "400" }}>{g}</span>
                            : <span style={{ color: "#2a4a2a" }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ background: "#0d2210", borderTop: "1px solid #1e3a1e", borderBottom: "2px solid #2a5a2a" }}>
                <td style={{ ...S.td, fontWeight: "700", color: "#e8f5e8" }}>OUT</td>
                <td style={{ ...S.td, fontWeight: "700", color: "#4a7a4a" }}>{holes.slice(0,9).reduce((s,h)=>s+h.par,0)}</td>
                <td style={S.td} />
                {[0,1,2,3].map(pi => {
                  const total = results.slice(0,9).reduce((s,r) => { const g=parseInt(r.g[pi],10); return s+(isNaN(g)?0:g); }, 0);
                  return <td key={pi} style={{ ...S.td, fontWeight: "700", color: "#e8f5e8" }}>{total||"—"}</td>;
                })}
              </tr>
              {[9,10,11,12,13,14,15,16,17].map(row => {
                const active = inPlay[row];
                return (
                  <tr key={row} style={{ background: row%2===0?"#071507":"#060f06", opacity: active?1:0.4 }}>
                    <td style={{ ...S.td, color: active?"#5a8a5a":"#3a5a3a", fontWeight: "600" }}>{row+1}</td>
                    <td style={{ ...S.td, color: active?"#4a7a4a":"#2a4a2a" }}>{holes[row].par}</td>
                    <td style={{ ...S.td, color: "#8aaa8a", fontSize: 12 }}>{holes[row].si}</td>
                    {[0,1,2,3].map(pi => {
                      const g = parseInt(results[row].g[pi], 10);
                      const diff = isNaN(g) ? null : g - holes[row].par;
                      return (
                        <td key={pi} style={{ ...S.td, padding: "4px 2px" }}>
                          {diff !== null
                            ? active
                              ? <ScoreBadge score={g} diff={diff} />
                              : <span style={{ color: "#4a5a4a", fontSize: 13, fontWeight: "400" }}>{g}</span>
                            : <span style={{ color: "#2a4a2a" }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ background: "#0d2210", borderTop: "1px solid #1e3a1e", borderBottom: "2px solid #2a5a2a" }}>
                <td style={{ ...S.td, fontWeight: "700", color: "#e8f5e8" }}>IN</td>
                <td style={{ ...S.td, fontWeight: "700", color: "#4a7a4a" }}>{holes.slice(9,18).reduce((s,h)=>s+h.par,0)}</td>
                <td style={S.td} />
                {[0,1,2,3].map(pi => {
                  const total = results.slice(9,18).reduce((s,r) => { const g=parseInt(r.g[pi],10); return s+(isNaN(g)?0:g); }, 0);
                  return <td key={pi} style={{ ...S.td, fontWeight: "700", color: "#e8f5e8" }}>{total||"—"}</td>;
                })}
              </tr>
              <tr style={{ background: "#071d07", borderTop: "1px solid #2a5a2a" }}>
                <td style={{ ...S.td, fontWeight: "700", color: COLORS[0], fontSize: 13 }}>TOT</td>
                <td style={{ ...S.td, fontWeight: "700", color: "#4a7a4a", fontSize: 13 }}>{holes.reduce((s,h)=>s+h.par,0)}</td>
                <td style={S.td} />
                {[0,1,2,3].map(pi => {
                  const total = results.reduce((s,r) => { const g=parseInt(r.g[pi],10); return s+(isNaN(g)?0:g); }, 0);
                  return <td key={pi} style={{ ...S.td, fontWeight: "700", color: COLORS[pi], fontSize: 13 }}>{total||"—"}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Sect>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS & STYLES
// ─────────────────────────────────────────────────────────────────────────────

// Shape indicators follow golf scorecard convention:
// Eagle or better = double circle, Birdie = single circle,
// Par = plain, Bogey = single square, Double bogey+ = double square
function ScoreBadge({ score, diff, large }) {
  const size = large ? 62 : 36;
  const fontSize = large ? 28 : 17;
  const strokeW = large ? 1.5 : 1.2;
  const gap = large ? 4 : 3;   // gap between double shapes
  const r = large ? 26 : 15;   // inner shape radius / half-size

  const shapes = () => {
    if (diff <= -2) {
      // Double circle
      return (
        <>
          <circle cx={size/2} cy={size/2} r={r - gap} fill="none" stroke="#e8f5e8" strokeWidth={strokeW} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8f5e8" strokeWidth={strokeW} />
        </>
      );
    } else if (diff === -1) {
      // Single circle
      return <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8f5e8" strokeWidth={strokeW} />;
    } else if (diff === 0) {
      // Plain — no shape
      return null;
    } else if (diff === 1) {
      // Single square
      const pad = size/2 - r;
      return <rect x={pad} y={pad} width={r*2} height={r*2} fill="none" stroke="#e8f5e8" strokeWidth={strokeW} />;
    } else {
      // Double square
      const pad = size/2 - r;
      const pad2 = pad - gap;
      return (
        <>
          <rect x={pad} y={pad} width={r*2} height={r*2} fill="none" stroke="#e8f5e8" strokeWidth={strokeW} />
          <rect x={pad2} y={pad2} width={r*2 + gap*2} height={r*2 + gap*2} fill="none" stroke="#e8f5e8" strokeWidth={strokeW} />
        </>
      );
    }
  };

  return (
    <div style={{ width: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        {shapes()}
        <text x={size/2} y={size/2 + fontSize*0.36} textAnchor="middle"
          fontSize={fontSize} fontWeight="700" fill="#e8f5e8"
          fontFamily="'DM Sans', sans-serif">{score}</text>
      </svg>
    </div>
  );
}

function InPlayToggle({ on, onToggle }) {
  return (
    <div className="inplay-toggle" onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      background: on ? "#0d2a0d" : "#1a0d0d",
      border: `2px solid ${on ? COLORS[0] : "#5a2a2a"}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 18, userSelect: "none",
    }}>
      <div style={{ width: 52, height: 28, borderRadius: 14, flexShrink: 0, background: on?COLORS[0]:"#3a1a1a", position: "relative", transition: "background 0.2s" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on?27:3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: "600", color: on?COLORS[0]:"#f87171", fontFamily: "'DM Sans', sans-serif" }}>
          {on ? "✓ In Play" : "✗ Not In Play"}
        </div>
        <div style={{ fontSize: 11, color: "#4a7a4a", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
          {on ? "Hole counted in totals" : "Hole excluded from totals"}
        </div>
      </div>
    </div>
  );
}
function CollapseSect({ title, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div onClick={onToggle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: open?10:0, cursor: "pointer", padding: "4px 0" }}>
        <div style={{ fontSize: 10, color: COLORS[0], letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
        <span style={{ fontSize: 14, color: COLORS[0] }}>{open?"▲":"▼"}</span>
      </div>
      {open && children}
    </div>
  );
}
function Sect({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: COLORS[0], letterSpacing: 2, marginBottom: 10, textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
      {children}
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#0a1a0a", color: "#e8f5e8", fontFamily: "'DM Sans', Arial, sans-serif" },
  dot: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#0a1a0a", fontWeight: "bold", fontSize: 14 },
  inp: { background: "#071507", border: "1px solid #1e3a1e", borderRadius: 8, color: "#e8f5e8", padding: "10px 12px", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none" },
  sel: { background: "#071507", border: "1px solid #1e3a1e", borderRadius: 6, color: "#e8f5e8", padding: "6px 8px", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", outline: "none" },
  th: { padding: "8px 6px", color: "#4a7a4a", fontWeight: "500", textAlign: "center", fontSize: 11, fontFamily: "'DM Sans', sans-serif" },
  td: { padding: "7px 4px", textAlign: "center", color: "#aaa", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  navBtn: { padding: "12px", background: "#0d2210", color: COLORS[0], border: "1px solid #2a5a2a", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  pmBtnInline: { width: 40, height: 40, background: "transparent", border: "none", color: COLORS[0], cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s", fontFamily: "'DM Sans', sans-serif" },
  pmBtnLarge: { width: "100%", padding: "10px 0", background: "#1e3a1e", color: COLORS[0], border: "1px solid #2a5a2a", borderRadius: 8, cursor: "pointer", fontSize: 22, transition: "all 0.1s", fontFamily: "'DM Sans', sans-serif" },
  startBtn: { width: "100%", padding: "16px", background: COLORS[0], color: "#0a1a0a", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 18, fontWeight: "bold", fontFamily: "'DM Sans', sans-serif", transition: "transform 0.1s" },
  courseBtn: { flex: 1, padding: "12px", background: "#0d2210", color: COLORS[0], border: "1px solid #2a5a2a", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
};

export default function App() {
  const [config, setConfig] = useState(null);
  const [savedRounds, setSavedRounds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sws_rounds") || "[]"); } catch { return []; }
  });

  function saveRound(roundData) {
    const entry = { ...roundData, savedAt: Date.now() };
    // Upsert: replace existing record with same roundId, otherwise prepend
    const existing = savedRounds.findIndex(r => r.roundId === entry.roundId);
    let updated;
    if (existing >= 0) {
      updated = savedRounds.map((r, i) => i === existing ? entry : r);
    } else {
      updated = [entry, ...savedRounds].slice(0, 3);
    }
    setSavedRounds(updated);
    try { localStorage.setItem("sws_rounds", JSON.stringify(updated)); } catch (_) {}
  }

  function loadRound(round) {
    setConfig(round.config);
  }

  return config
    ? <Scorecard config={config} onBack={() => setConfig(null)} onSave={saveRound} />
    : <Setup onStart={setConfig} savedRounds={savedRounds} onLoadRound={loadRound} />;
}
