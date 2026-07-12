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

const cfs = [0]; 
for(let i=1; i<=12; i++) cfs.push(-500000);
cfs.push(900000); // 13
cfs.push(1300000); // 14
cfs.push(1700000); // 15
cfs.push(2100000); // 16
for(let i=17; i<=24; i++) cfs.push(0);
cfs.push(6519000); // 25

console.log("IRR:", calculateIRR(cfs) * 100, "%");
