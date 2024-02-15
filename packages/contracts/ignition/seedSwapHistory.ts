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
  const swapOpsAddress = '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0';
  const stableCoinAddress = '0x95401dc811bb5740090279ba06cfa8fcf6113778';
  const swapMap = {
    BTC: {
      contract: '0x9a676e781a523b5d0c0e43731313a708cb607508',
      file: 'BTC.csv',
      swaps: [],
      positionMultiplier: 0.001,
      digits: 9,
    },
    USDT: {
      contract: '0x959922be3caee4b8cd9a407cc3ac1c251c2007b1',
      file: 'USDT.csv',
      swaps: [],
      positionMultiplier: 1,
      digits: 18,
    },
    AAPL: {
      contract: '0x998abeb3e57409262ae5b751f60747921b33613e',
      file: 'AAPL.csv',
      swaps: [],
      positionMultiplier: 0.01,
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

    for (const { contract, positionMultiplier, digits } of Object.values(swapMap)) {
      const price = swapRow[contract];
      if (!price) continue;

      const isBuy = Math.random() > 0.5;
      const amountIn = isBuy ? price * positionMultiplier : positionMultiplier;
      await swapOps.swapExactTokensForTokens(
        parseUnits(amountIn.toString(), digits),
        0,
        isBuy ? [stableCoinAddress, contract] : [contract, stableCoinAddress],
        deployer,
        deadline
      );
    }

    await mine(1);
    if (i % 2000 === 0) console.log(Math.round((i / swapRows.length) * 100) + '%');
  }

  console.log('Swaps seeded.', swapRows.length);
})();
