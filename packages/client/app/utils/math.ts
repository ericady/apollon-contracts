export const roundCurrency = (value: number, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const percentageChange = (newValue: number, oldValue: number, decimals = 2) => {
  return roundCurrency(((newValue - oldValue) / oldValue) * 100, decimals);
};
