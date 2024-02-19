import { ethers } from 'hardhat';
import { getLatestBlockTimestamp } from '../utils/testHelper';
import { mine } from '@nomicfoundation/hardhat-network-helpers';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { parseUnits } from 'ethers';
import swapOpsAbi from '../abi/SwapOperations.json';

(async () => {
  console.log('Seeding swaps...');

  const deployer = (await ethers.getSigners())[0];
  const swapOpsAddress = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
  const stableCoinAddress = '0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB';
  const swapMap = {
    BTC: {
      contract: '0x9A676e781A523b5d0C0e43731313A708CB607508',
      file: 'BTC.csv',
      swaps: [],
      positionMultiplier: 0.00001,
      digits: 9,
    },
    USDT: {
      contract: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
      file: 'USDT.csv',
      swaps: [],
      positionMultiplier: 0.001,
      digits: 18,
    },
    AAPL: {
      contract: '0x9E545E3C0baAB3E08CdfD552C960A1050f373042',
      file: 'AAPL.csv',
      swaps: [],
      positionMultiplier: 0.00001,
      digits: 18,
    },
  };
  const dirPath = path.join(__dirname, 'swaps');

  await Promise.all(
    Object.values(swapMap).map(({ file, swaps }) => {
      return new Promise(resolve => {
        fs.createReadStream(path.join(dirPath, file))
          .pipe(csv())
          .on('data', data => swaps.push(data))
          .on('end', resolve);
      });
    })
  );

  const swapRows = []; // {BTC: openPrice, USDT: openPrice, ...}
  const swapLength = swapMap.BTC.swaps.length;
  for (let i = 0; i < swapLength; i++) {
    const row = {};
    for (const [symbol, { swaps }] of Object.entries(swapMap)) {
      if (swaps[i]?.open) row[symbol] = swaps[i].open;
    }
    swapRows.push(row);
  }

  const deadline = (await getLatestBlockTimestamp()) + 300000;
  const swapOps = await ethers.getContractAt(swapOpsAbi, swapOpsAddress);
  for (let i = 0; i < swapRows.length; i++) {
    const swapRow = swapRows[i];

    for (const [symbol, { contract, positionMultiplier, digits }] of Object.entries(swapMap)) {
      const price = swapRow[symbol];
      if (!price) continue;

      const isBuy = Math.random() > 0.5;
      const amountIn = isBuy ? price * positionMultiplier : positionMultiplier;

      try {
        await swapOps.swapExactTokensForTokens(
          parseUnits(amountIn.toString(), digits),
          0,
          isBuy ? [stableCoinAddress, contract] : [contract, stableCoinAddress],
          deployer,
          deadline
        );
      } catch (e) {}
    }

    await mine(1);
    if (i % 100 === 0) console.log((i / swapRows.length) * 100 + '%');
  }

  console.log('Swaps seeded.', swapRows.length);
})();
