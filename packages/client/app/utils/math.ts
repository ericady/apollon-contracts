export const stdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const roundCurrency = (value: number, decimals = 2, minDecimals = 2) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals));
};

export const roundNumber = (value: number, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const percentageChange = (newValue: number, oldValue: number) => {
  return (newValue - oldValue) / oldValue;
};

export const displayPercentage = (
  value: number,
  omitLabel: 'omit' | 'positive' | 'default' = 'default',
  decimals: number = 2,
) => {
  return omitLabel === 'omit'
    ? `${roundCurrency(value * 100, decimals, decimals)}`
    : omitLabel === 'positive'
    ? `${value > 0 ? '+' : ''}${roundCurrency(value * 100, decimals, decimals)} %`
    : `${roundCurrency(value * 100, decimals, decimals)} %`;
};
