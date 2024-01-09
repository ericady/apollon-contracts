import { ethers } from "ethers";

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

export function floatToBigInt(floatNumber: number, precision: number = 18) {
  // const factor = Math.pow(10, precision);
  // const bigIntNumber = BigInt(Math.round(floatNumber * factor));
  // return bigIntNumber;

   // Convert the float to a string to handle precision
   const floatString = floatNumber.toString();

   // Use ethers.js utility to parse the float string into a BigInt
   // This will account for the decimal places and convert accordingly
   const bigIntValue = ethers.parseUnits(floatString, precision);
 
   return bigIntValue;
}

export function bigIntStringToFloat(bigIntValue: string, decimals = 18) {
  const asBigint = ethers.parseUnits(bigIntValue, decimals)

  // Use ethers.js utility to format the BigInt value into a string
  // This takes into account the decimal places
  const formattedString = ethers.formatUnits(asBigint, decimals);

  // Convert the formatted string to a float
  const floatValue = parseFloat(formattedString);

  return floatValue;
}

//  die currentSwapFee wird in dem event als 1e6 angegeben → 1000000 sind 100%, 3000 sind 0.3%
export const convertSwapFee = (swapFee: number) => {
  return swapFee / 1000000;
};
