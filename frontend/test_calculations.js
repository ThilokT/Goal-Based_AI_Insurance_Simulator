/**
 * Test calculations for ICICI Pru Signature Assure and ICICI Pru GIFT Pro
 * Run this file using: node test_calculations.js
 * 
 * You can modify the parameters below to verify how different inputs
 * affect the final maturity values.
 */

console.log("==================================================");
console.log(" TESTING: ICICI PRU SIGNATURE ASSURE (ULIP MODEL)");
console.log("==================================================");

function calculateSignatureAssure({ 
  annualPremium = 144000, 
  ppt = 10, 
  tenure = 20, 
  returnRate = 0.08, 
  fmc = 0.0135,
  adminCharge = 100,
  mortalityRateAnnual = 0.0012, // per 1000 sum at risk
  pacFrontLoaded = 0.05 // 5% for first 5 years
}) {
  let U = 0;
  const P = annualPremium / 12;
  const t1 = ppt;
  const t2 = tenure;
  const r = returnRate;
  
  // Signature Assure typically provides 10x Annual Premium as life cover
  const SA = annualPremium * 10;

  for (let m = 1; m <= t2 * 12; m++) {
    // Premium Allocation Charge: front-loaded for first 5 years
    const PAC = m <= 5 * 12 ? pacFrontLoaded : 0.0;
    
    // Policy Administration Charge: flat monthly fee
    const Admin = adminCharge;
    
    // Mortality Charge: dynamically based on Sum at Risk
    const sumAtRisk = Math.max(0, SA - U);
    const mortalityRateMonthly = mortalityRateAnnual / 12;
    const MC = sumAtRisk * mortalityRateMonthly;
    
    const currentP = m <= t1 * 12 ? P : 0;
    
    // Month-by-month recursive step
    U = (U + currentP * (1 - PAC) - MC - Admin) * (1 + (r - fmc) / 12);
  }
  
  return U;
}

// 1. Signature Assure at 8% (Moderate)
const sigAssureModerate = calculateSignatureAssure({ returnRate: 0.08 });
console.log(`Signature Assure (8% Return):`);
console.log(`- Expected: ~3,780,000 (37.80 Lakhs)`);
console.log(`- Calculated: ${sigAssureModerate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
console.log(`- Delta: ${((sigAssureModerate - 3780000) / 3780000 * 100).toFixed(2)}%\n`);

// 2. Signature Assure at 12.49% (Aggressive)
const sigAssureAggressive = calculateSignatureAssure({ returnRate: 0.1249 });
console.log(`Signature Assure (12.49% Return):`);
console.log(`- Expected: ~7,671,000 (76.71 Lakhs)`);
console.log(`- Calculated: ${sigAssureAggressive.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
console.log(`- Delta: ${((sigAssureAggressive - 7671000) / 7671000 * 100).toFixed(2)}%\n`);


console.log("==================================================");
console.log(" TESTING: ICICI PRU GIFT PRO (ALGEBRAIC MODEL)   ");
console.log("==================================================");

function calculateGiftPro({
  annualPremium = 1500000,
  ppt = 12,
  tenure = 15,
  returnRate = 0.05256
}) {
  const P = annualPremium;
  const n = ppt;
  const m = tenure;
  const r = returnRate;
  
  // Phase 1: Annuity Due (Accumulation Phase)
  const fvAnnuity = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  
  // Phase 2: Lock-in Phase (Compounding without contributions)
  const maturityValue = fvAnnuity * Math.pow(1 + r, m - n);
  
  return maturityValue;
}

const giftProMaturity = calculateGiftPro({ returnRate: 0.05256 });
console.log(`GIFT Pro (5.256% IRR):`);
console.log(`- Expected: 29,600,000 (2.96 Crore)`);
console.log(`- Calculated: ${giftProMaturity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
console.log(`- Delta: ${((giftProMaturity - 29600000) / 29600000 * 100).toFixed(2)}%\n`);

console.log("==================================================");
console.log(" TESTING: ICICI PRU PROTECT N GAIN (MONTHLY SIP) ");
console.log("==================================================");

function calculateProtectNGain({
  monthlyPremium = 7179,
  ppt = 12,
  tenure = 30,
  returnRate = 0.0528 // 8% scenario effective net rate
}) {
  const P = monthlyPremium;
  const n = ppt;
  const m = tenure;
  const monthlyR = returnRate / 12;
  
  // Phase 1: Annuity Due (Accumulation Phase over months)
  const fvAnnuity = P * ((Math.pow(1 + monthlyR, n * 12) - 1) / monthlyR) * (1 + monthlyR);
  
  // Phase 2: Lock-in Phase (Compounding without contributions for remaining months)
  const maturityValue = fvAnnuity * Math.pow(1 + monthlyR, (m - n) * 12);
  
  return maturityValue;
}

const protectNGainModerate = calculateProtectNGain({ returnRate: 0.0528 });
console.log(`Protect N Gain (8% Scenario -> Net 5.28%):`);
console.log(`- Expected: ~3,715,000 (37.15 Lakhs)`);
console.log(`- Calculated: ${protectNGainModerate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
console.log(`- Delta: ${((protectNGainModerate - 3715000) / 3715000 * 100).toFixed(2)}%\n`);

const protectNGainAggressive = calculateProtectNGain({ returnRate: 0.0943 });
console.log(`Protect N Gain (12.49% Scenario -> Net 9.43%):`);
console.log(`- Expected: ~10,500,000 (1.05 Crore)`);
console.log(`- Calculated: ${protectNGainAggressive.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
console.log(`- Delta: ${((protectNGainAggressive - 10500000) / 10500000 * 100).toFixed(2)}%\n`);

console.log("==================================================");
console.log(" TESTING: ICICI PRU WISH (MORBIDITY RISK PRICING)");
console.log("==================================================");

function calculateWishPremium(age, gender, coverageTerm, ppt, vitalCover) {
  // Base coverage multipliers
  const surgicalCover = vitalCover * 0.50;
  const maternityCover = vitalCover * 0.25;
  const totalPotentialBenefit = vitalCover + surgicalCover + maternityCover;

  // Real-world data points for 30-year-old Female, 20L Vital Cover
  let monthlyPremium = 0;
  const condensationRatio = coverageTerm / ppt;

  if (age === 30 && gender === 'female' && vitalCover === 2000000) {
    if (coverageTerm === 8 && ppt === 8) {
      monthlyPremium = 517; // Regular Pay
    } else if (coverageTerm === 15 && ppt === 10) {
      monthlyPremium = 865; // Limited Pay (15-yr cover condensed to 10-yr pay)
    } else if (coverageTerm === 25 && ppt === 15) {
      monthlyPremium = 1058; // Limited Pay (25-yr cover condensed to 15-yr pay)
    } else {
      // Basic fallback interpolation based on condensation ratio
      const baseRate = 517;
      monthlyPremium = Math.round(baseRate * condensationRatio);
    }
  } else {
    monthlyPremium = -1; // Unknown actuarial data for this profile
  }

  const totalCost = monthlyPremium * 12 * ppt;
  const costToBenefitRatio = totalPotentialBenefit / totalCost;

  return {
    monthlyPremium,
    totalCost,
    totalPotentialBenefit,
    condensationRatio,
    costToBenefitRatio
  };
}

const wishOptionA = calculateWishPremium(30, 'female', 8, 8, 2000000);
console.log(`WISH Option A: Regular Pay (8yr Cover / 8yr PPT)`);
console.log(`- Condensation Ratio: ${wishOptionA.condensationRatio.toFixed(2)}x`);
console.log(`- Monthly Premium: ₹${wishOptionA.monthlyPremium}`);
console.log(`- Total Paid: ₹${wishOptionA.totalCost.toLocaleString('en-IN')}`);
console.log(`- Total Potential Benefit: ₹${wishOptionA.totalPotentialBenefit.toLocaleString('en-IN')}`);
console.log(`- Payout is ${wishOptionA.costToBenefitRatio.toFixed(1)}x the cost\n`);

const wishOptionB = calculateWishPremium(30, 'female', 15, 10, 2000000);
console.log(`WISH Option B: Limited Pay (15yr Cover / 10yr PPT)`);
console.log(`- Condensation Ratio: ${wishOptionB.condensationRatio.toFixed(2)}x (15 years of risk condensed to 10 years pay)`);
console.log(`- Monthly Premium: ₹${wishOptionB.monthlyPremium}`);
console.log(`- Total Paid: ₹${wishOptionB.totalCost.toLocaleString('en-IN')}`);
console.log(`- Total Potential Benefit: ₹${wishOptionB.totalPotentialBenefit.toLocaleString('en-IN')}`);
console.log(`- Payout is ${wishOptionB.costToBenefitRatio.toFixed(1)}x the cost\n`);

const wishOptionC = calculateWishPremium(30, 'female', 25, 15, 2000000);
console.log(`WISH Option C: Limited Pay (25yr Cover / 15yr PPT)`);
console.log(`- Condensation Ratio: ${wishOptionC.condensationRatio.toFixed(2)}x (25 years of risk condensed to 15 years pay)`);
console.log(`- Monthly Premium: ₹${wishOptionC.monthlyPremium}`);
console.log(`- Total Paid: ₹${wishOptionC.totalCost.toLocaleString('en-IN')}`);
console.log(`- Total Potential Benefit: ₹${wishOptionC.totalPotentialBenefit.toLocaleString('en-IN')}`);
console.log(`- Payout is ${wishOptionC.costToBenefitRatio.toFixed(1)}x the cost\n`);

console.log("==================================================");
console.log(" TESTING: ICICI PRU GPP FLEXI (IRR CASH FLOW)    ");
console.log("==================================================");

// Newton-Raphson method to calculate Internal Rate of Return (IRR)
function calculateIRR(cashFlows, guess = 0.05) {
  const maxIterations = 1000;
  const precision = 1e-7;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      derivativeNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }

    const nextRate = rate - npv / derivativeNpv;

    if (Math.abs(nextRate - rate) < precision) {
      return nextRate;
    }
    rate = nextRate;
  }
  return rate;
}

// Scenario: 41M, Pay 7 Years, Wait 8 Years (15 yr total deferment), Life Expectancy 85
const premium = -300000;
const payYears = 7;
const waitYears = 8;
const defermentTotal = payYears + waitYears; // 15 years
const payoutStartAge = 41 + defermentTotal; // Age 56
const lifeExpectancy = 85;
const payoutYears = lifeExpectancy - payoutStartAge + 1; // 30 years of payout (56 to 85 inclusive)

// 1. With ROP Scenario
const cashFlowsWithROP = [];
for (let i = 1; i <= payYears; i++) cashFlowsWithROP.push(premium);
for (let i = 1; i <= waitYears; i++) cashFlowsWithROP.push(0);
for (let i = 1; i <= payoutYears; i++) {
  if (i === payoutYears) {
    cashFlowsWithROP.push(301725 + (Math.abs(premium) * payYears)); // Final pension + ROP
  } else {
    cashFlowsWithROP.push(301725);
  }
}
const irrWithROP = calculateIRR(cashFlowsWithROP) * 100;

// 2. Without ROP Scenario
const cashFlowsNoROP = [];
for (let i = 1; i <= payYears; i++) cashFlowsNoROP.push(premium);
for (let i = 1; i <= waitYears; i++) cashFlowsNoROP.push(0);
for (let i = 1; i <= payoutYears; i++) {
  cashFlowsNoROP.push(294050); // No ROP at end
}
const irrNoROP = calculateIRR(cashFlowsNoROP) * 100;

console.log(`GPP Flexi Option: With Return of Premium (ROP)`);
console.log(`- Annual Payout: ₹3,01,725`);
console.log(`- Cash flows built: ${cashFlowsWithROP.length} years (to age 85)`);
console.log(`- Calculated True IRR: ${irrWithROP.toFixed(2)}%\n`);

console.log(`GPP Flexi Option: Without Return of Premium`);
console.log(`- Annual Payout: ₹294,050`);
console.log(`- Cash flows built: ${cashFlowsNoROP.length} years (to age 85)`);
console.log(`- Calculated True IRR: ${irrNoROP.toFixed(2)}%\n`);

console.log(`Insight: The 'With ROP' option mathematically yields a higher IRR (${irrWithROP.toFixed(2)}% vs ${irrNoROP.toFixed(2)}%) despite having a capital return liability. This confirms the marketing subsidy anomaly.\n`);

console.log("==================================================");
console.log(" TESTING: ICICI PRU SMARTKID 360 (ALGEBRAIC)     ");
console.log("==================================================");

// Scenario: Pay 1.5L for 12Y, Term 25Y. Payouts at Year 13, 14, 15, 16
const skPremium = 150000;
const skPPT = 12;
const skPT = 25;
const skSA = skPremium * 10;
const hurdleRate = 0.05719; // 5.719% Fixed IRR

// Calculate Future Value of all Premiums at Year 25
let fvPremiums = 0;
// Payments modeled at the end of the year to match standard IRR solver
// So Premium 1 compounds for 24 years, Premium 12 compounds for 13 years
for (let t = 1; t <= skPPT; t++) {
  fvPremiums += skPremium * Math.pow(1 + hurdleRate, skPT - t);
}

// Calculate the 4 Milestones
const p1 = skSA * 0.18; // 18% of SA
const p2 = p1 + (skSA * 0.08); // +8% step-up
const p3 = p2 + (skSA * 0.08); 
const p4 = p3 + (skSA * 0.08);

// Calculate Future Value of all Payouts at Year 25 (paid at end of year)
let fvPayouts = 0;
fvPayouts += p1 * Math.pow(1 + hurdleRate, skPT - 13);
fvPayouts += p2 * Math.pow(1 + hurdleRate, skPT - 14);
fvPayouts += p3 * Math.pow(1 + hurdleRate, skPT - 15);
fvPayouts += p4 * Math.pow(1 + hurdleRate, skPT - 16);

// Final Maturity Benefit
const expectedMaturity = 6519000; // From Website
const calculatedMaturity = fvPremiums - fvPayouts;
const totalBenefit = p1 + p2 + p3 + p4 + calculatedMaturity;

console.log(`SmartKid 360 (Increasing Income Option):`);
console.log(`- Base Premium: ₹${skPremium}`);
console.log(`- Sum Assured: ₹${skSA}`);
console.log(`- Payout 1 (Yr 13): ₹${p1.toLocaleString('en-IN')}`);
console.log(`- Payout 2 (Yr 14): ₹${p2.toLocaleString('en-IN')}`);
console.log(`- Payout 3 (Yr 15): ₹${p3.toLocaleString('en-IN')}`);
console.log(`- Payout 4 (Yr 16): ₹${p4.toLocaleString('en-IN')}`);
console.log(`- Expected Maturity: ₹${expectedMaturity.toLocaleString('en-IN')}`);
console.log(`- Calculated Maturity: ₹${Math.round(calculatedMaturity).toLocaleString('en-IN')}`);
const skDelta = ((calculatedMaturity - expectedMaturity) / expectedMaturity) * 100;
console.log(`- Delta: ${skDelta.toFixed(2)}%`);
console.log(`- UI Total Benefit Display: ₹${(totalBenefit/100000).toFixed(2)} Lakhs\n`);

console.log("Done.");
