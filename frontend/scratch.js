function calculateNPV(rate) {
    let npv = 0;
    for(let t=1; t<=12; t++) { npv += -500000 / Math.pow(1+rate, t); }
    npv += 900000 / Math.pow(1+rate, 13);
    npv += 1297000 / Math.pow(1+rate, 14);
    npv += 1694000 / Math.pow(1+rate, 15);
    npv += 2090000 / Math.pow(1+rate, 16);
    npv += 6519000 / Math.pow(1+rate, 25);
    return npv;
}
console.log("NPV at 6%:", calculateNPV(0.06));
console.log("NPV at 5.5%:", calculateNPV(0.055));
console.log("NPV at 6.1%:", calculateNPV(0.061));
