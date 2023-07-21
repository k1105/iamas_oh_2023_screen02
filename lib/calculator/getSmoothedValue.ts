export const getSmoothedValue = (arr: number[][], dimention: number) => {
  // [[val, val, val...], [val, val, val...], ...]
  const keys = [];
  for (let i = 0; i < dimention; i++) {
    let totalWeight = 0;
    let val = 0;
    for (let j = 0; j < arr.length; j++) {
      const weight =
        (arr.length - 1) / 2 - Math.abs((arr.length - 1) / 2 - j) + 1;
      totalWeight += weight;
      val += arr[j][i] * weight;
    }
    keys.push(val / totalWeight);
  }

  return keys;
};
