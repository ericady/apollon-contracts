import { ethers } from 'ethers';

export const getCheckSum = (address: string) => {
  return ethers.getAddress(address);
};
