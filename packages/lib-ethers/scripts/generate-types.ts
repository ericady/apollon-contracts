import fs from 'fs-extra';
import path from 'path';

import { Interface, ParamType } from '@ethersproject/abi';

import StoragePool from '../../contracts/artifacts/contracts/StoragePool.sol/StoragePool.json';
import BorrowerOperations from '../../contracts/artifacts/contracts/BorrowerOperations.sol/BorrowerOperations.json';
import RedemptionOperations from '../../contracts/artifacts/contracts/RedemptionOperations.sol/RedemptionOperations.json';
import TroveManager from '../../contracts/artifacts/contracts/TroveManager.sol/TroveManager.json';
import DebtToken from '../../contracts/artifacts/contracts/DebtToken.sol/DebtToken.json';
import PriceFeed from '../../contracts/artifacts/contracts/PriceFeed.sol/PriceFeed.json';
import MockPriceFeed from '../../contracts/artifacts/contracts/Mock/MockPriceFeed.sol/MockPriceFeed.json';
import StabilityPool from '../../contracts/artifacts/contracts/StabilityPool.sol/StabilityPool.json';
import StabilityPoolManager from '../../contracts/artifacts/contracts/StabilityPoolManager.sol/StabilityPoolManager.json';
import DebtTokenManager from '../../contracts/artifacts/contracts/DebtTokenManager.sol/DebtTokenManager.json';
import CollTokenManager from '../../contracts/artifacts/contracts/CollTokenManager.sol/CollTokenManager.json';
import IERC20 from '../../contracts/artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json';
import MockERC20 from '../../contracts/artifacts/contracts/Mock/MockERC20.sol/MockERC20.json';
import SwapERC20 from '../../contracts/artifacts/contracts/SwapERC20.sol/SwapERC20.json';
import SwapPair from '../../contracts/artifacts/contracts/SwapPair.sol/SwapPair.json';
import SwapOperations from '../../contracts/artifacts/contracts/SwapOperations.sol/SwapOperations.json';
import ReservePool from '../../contracts/artifacts/contracts/ReservePool.sol/ReservePool.json';

// todo
// import CommunityIssuance from '../../contracts/artifacts/contracts/LQTY/CommunityIssuance.sol/CommunityIssuance.json';
// import LQTYStaking from '../../contracts/artifacts/contracts/LQTY/LQTYStaking.sol/LQTYStaking.json';
// import LQTYToken from '../../contracts/artifacts/contracts/LQTY/LQTYToken.sol/LQTYToken.json';
// import MultiTroveGetter from '../../contracts/artifacts/contracts/MultiTroveGetter.sol/MultiTroveGetter.json';
// import Unipool from '../../contracts/artifacts/contracts/LPRewards/Unipool.sol/Unipool.json';
// import LockupContractFactory from '../../contracts/artifacts/contracts/LQTY/LockupContractFactory.sol/LockupContractFactory.json';

const getTupleType = (components: ParamType[], flexible: boolean) => {
  if (components.every(component => component.name)) {
    return '{ ' + components.map(component => `${component.name}: ${getType(component, flexible)}`).join('; ') + ' }';
  } else {
    return `[${components.map(component => getType(component, flexible)).join(', ')}]`;
  }
};

const getType = ({ baseType, components, arrayChildren }: ParamType, flexible: boolean): string => {
  switch (baseType) {
    case 'address':
    case 'string':
      return 'string';

    case 'bool':
      return 'boolean';

    case 'array':
      return `${getType(arrayChildren, flexible)}[]`;

    case 'tuple':
      return getTupleType(components, flexible);
  }

  if (baseType.startsWith('bytes')) {
    return flexible ? 'BytesLike' : 'string';
  }

  const match = baseType.match(/^(u?int)([0-9]+)$/);
  if (match) {
    return flexible ? 'BigNumberish' : parseInt(match[2]) >= 53 ? 'BigNumber' : 'number';
  }

  throw new Error(`unimplemented type ${baseType}`);
};

const declareInterface = ({
  contractName,
  interface: { events, functions },
}: {
  contractName: string;
  interface: Interface;
}) =>
  [
    `interface ${contractName}Calls {`,
    ...Object.values(functions)
      .filter(({ constant }) => constant)
      .map(({ name, inputs, outputs }) => {
        const params = [
          ...inputs.map((input, i) => `${input.name || 'arg' + i}: ${getType(input, true)}`),
          `_overrides?: CallOverrides`,
        ];

        let returnType: string;
        if (!outputs || outputs.length == 0) {
          returnType = 'void';
        } else if (outputs.length === 1) {
          returnType = getType(outputs[0], false);
        } else {
          returnType = getTupleType(outputs, false);
        }

        return `  ${name}(${params.join(', ')}): Promise<${returnType}>;`;
      }),
    '}\n',

    `interface ${contractName}Transactions {`,
    ...Object.values(functions)
      .filter(({ constant }) => !constant)
      .map(({ name, payable, inputs, outputs }) => {
        const overridesType = payable ? 'PayableOverrides' : 'Overrides';

        const params = [
          ...inputs.map((input, i) => `${input.name || 'arg' + i}: ${getType(input, true)}`),
          `_overrides?: ${overridesType}`,
        ];

        let returnType: string;
        if (!outputs || outputs.length == 0) {
          returnType = 'void';
        } else if (outputs.length === 1) {
          returnType = getType(outputs[0], false);
        } else {
          returnType = getTupleType(outputs, false);
        }

        return `  ${name}(${params.join(', ')}): Promise<${returnType}>;`;
      }),
    '}\n',

    `export interface ${contractName}`,
    `  extends _TypedLiquityContract<${contractName}Calls, ${contractName}Transactions> {`,

    '  readonly filters: {',
    ...Object.values(events).map(({ name, inputs }) => {
      const params = inputs.map(
        input => `${input.name}?: ${input.indexed ? `${getType(input, true)} | null` : 'null'}`
      );

      return `    ${name}(${params.join(', ')}): EventFilter;`;
    }),
    '  };',

    ...Object.values(events).map(
      ({ name, inputs }) =>
        `  extractEvents(logs: Log[], name: "${name}"): _TypedLogDescription<${getTupleType(inputs, false)}>[];`
    ),

    '}',
  ].join('\n');

const contractArtifacts = [
  BorrowerOperations,
  RedemptionOperations,
  TroveManager,
  StoragePool,
  DebtToken,
  PriceFeed,
  MockPriceFeed,
  StabilityPool,
  StabilityPoolManager,
  DebtTokenManager,
  CollTokenManager,
  IERC20,
  MockERC20,
  IERC20,
  PriceFeed,
  StabilityPool,
  TroveManager,
  SwapERC20,
  SwapPair,
  SwapOperations,
  ReservePool,
];

const contracts = contractArtifacts.map(({ contractName, abi }) => ({
  contractName,
  interface: new Interface(abi),
}));

const output = `
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/abstract-provider";
import { BytesLike } from "@ethersproject/bytes";
import {
  Overrides,
  CallOverrides,
  PayableOverrides,
  EventFilter
} from "@ethersproject/contracts";

import { _TypedLiquityContract, _TypedLogDescription } from "../src/contracts";

${contracts.map(declareInterface).join('\n\n')}
`;

fs.mkdirSync('types', { recursive: true });
fs.writeFileSync(path.join('types', 'index.ts'), output);

fs.removeSync('abi');
fs.mkdirSync('abi', { recursive: true });
contractArtifacts.forEach(({ contractName, abi }) =>
  fs.writeFileSync(path.join('abi', `${contractName}.json`), JSON.stringify(abi, undefined, 2))
);
