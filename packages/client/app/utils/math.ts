export const roundCurrency = (value: number, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const percentageChange = (newValue: number, oldValue: number) => {
  return (newValue - oldValue) / oldValue;
};

export const displayPercentage = (value: number, omitLabel = false) => {
  return omitLabel ? `${roundCurrency(value * 100)}` : `${roundCurrency(value * 100)} %`;
};
