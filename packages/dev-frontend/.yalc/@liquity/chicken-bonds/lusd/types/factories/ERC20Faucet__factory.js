'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ERC20Faucet__factory = void 0;
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
const ethers_1 = require('ethers');
const _abi = [
  {
    inputs: [
      {
        internalType: 'string',
        name: '_name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_symbol',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_tapAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_tapPeriod',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'subtractedValue',
        type: 'uint256',
      },
    ],
    name: 'decreaseAllowance',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'addedValue',
        type: 'uint256',
      },
    ],
    name: 'increaseAllowance',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'lastTapped',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'nonces',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deadline',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: 'v',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: 'r',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 's',
        type: 'bytes32',
      },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tapAmount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tapPeriod',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
const _bytecode =
  '0x6101806040523480156200001257600080fd5b506040516200192c3803806200192c83398101604081905262000035916200023a565b6040805180820190915260018152603160f81b6020820152849081908186600362000061838262000343565b50600462000070828262000343565b5050825160209384012082519284019290922060e08390526101008190524660a0818152604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f818901819052818301979097526060810194909452608080850193909352308483018190528151808603909301835260c09485019091528151919096012090529290925261012052506200010f90503362000123565b6101409190915261016052506200040f9050565b600780546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200019d57600080fd5b81516001600160401b0380821115620001ba57620001ba62000175565b604051601f8301601f19908116603f01168101908282118183101715620001e557620001e562000175565b816040528381526020925086838588010111156200020257600080fd5b600091505b8382101562000226578582018301518183018401529082019062000207565b600093810190920192909252949350505050565b600080600080608085870312156200025157600080fd5b84516001600160401b03808211156200026957600080fd5b62000277888389016200018b565b955060208701519150808211156200028e57600080fd5b506200029d878288016200018b565b604087015160609097015195989097509350505050565b600181811c90821680620002c957607f821691505b602082108103620002ea57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200033e57600081815260208120601f850160051c81016020861015620003195750805b601f850160051c820191505b818110156200033a5782815560010162000325565b5050505b505050565b81516001600160401b038111156200035f576200035f62000175565b6200037781620003708454620002b4565b84620002f0565b602080601f831160018114620003af5760008415620003965750858301515b600019600386901b1c1916600185901b1785556200033a565b600085815260208120601f198616915b82811015620003e057888601518255948401946001909101908401620003bf565b5085821015620003ff5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b60805160a05160c05160e051610100516101205161014051610160516114a9620004836000396000818161029c0152610f45015260008181610231015261086d01526000610cb101526000610d0001526000610cdb01526000610c3401526000610c5e01526000610c8801526114a96000f3fe608060405234801561001057600080fd5b50600436106101625760003560e01c8063715018a6116100c8578063a457c2d71161008c578063dd62ed3e11610066578063dd62ed3e1461031a578063f2fde38b14610353578063fd2210311461036657600080fd5b8063a457c2d7146102e1578063a9059cbb146102f4578063d505accf1461030757600080fd5b8063715018a61461027c5780637ecebe0014610284578063844c827a146102975780638da5cb5b146102be57806395d89b41146102d957600080fd5b80633644e5151161012a5780634865701b116101045780634865701b1461020c578063542522071461022c57806370a082311461025357600080fd5b80633644e515146101dc57806339509351146101e457806340c10f19146101f757600080fd5b806306fdde0314610167578063095ea7b31461018557806318160ddd146101a857806323b872dd146101ba578063313ce567146101cd575b600080fd5b61016f61036e565b60405161017c9190611270565b60405180910390f35b6101986101933660046112da565b610400565b604051901515815260200161017c565b6002545b60405190815260200161017c565b6101986101c8366004611304565b61041a565b6040516012815260200161017c565b6101ac61043e565b6101986101f23660046112da565b61044d565b61020a6102053660046112da565b61048c565b005b6101ac61021a366004611340565b60086020526000908152604090205481565b6101ac7f000000000000000000000000000000000000000000000000000000000000000081565b6101ac610261366004611340565b6001600160a01b031660009081526020819052604090205490565b61020a6104f9565b6101ac610292366004611340565b61055f565b6101ac7f000000000000000000000000000000000000000000000000000000000000000081565b6007546040516001600160a01b03909116815260200161017c565b61016f61057d565b6101986102ef3660046112da565b61058c565b6101986103023660046112da565b61061e565b61020a610315366004611362565b61062c565b6101ac6103283660046113d5565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b61020a610361366004611340565b610790565b61020a61085b565b60606003805461037d90611408565b80601f01602080910402602001604051908101604052809291908181526020018280546103a990611408565b80156103f65780601f106103cb576101008083540402835291602001916103f6565b820191906000526020600020905b8154815290600101906020018083116103d957829003601f168201915b5050505050905090565b60003361040e8185856108a3565b60019150505b92915050565b6000336104288582856109c7565b610433858585610a59565b506001949350505050565b6000610448610c27565b905090565b3360008181526001602090815260408083206001600160a01b038716845290915281205490919061040e908290869061048790879061143c565b6108a3565b6007546001600160a01b031633146104eb5760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260448201526064015b60405180910390fd5b6104f58282610d51565b5050565b6007546001600160a01b031633146105535760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260448201526064016104e2565b61055d6000610e30565b565b6001600160a01b038116600090815260056020526040812054610414565b60606004805461037d90611408565b3360008181526001602090815260408083206001600160a01b0387168452909152812054909190838110156106115760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084016104e2565b61043382868684036108a3565b60003361040e818585610a59565b8342111561067c5760405162461bcd60e51b815260206004820152601d60248201527f45524332305065726d69743a206578706972656420646561646c696e6500000060448201526064016104e2565b60007f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886106ab8c610e8f565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e001604051602081830303815290604052805190602001209050600061070682610eb7565b9050600061071682878787610f05565b9050896001600160a01b0316816001600160a01b0316146107795760405162461bcd60e51b815260206004820152601e60248201527f45524332305065726d69743a20696e76616c6964207369676e6174757265000060448201526064016104e2565b6107848a8a8a6108a3565b50505050505050505050565b6007546001600160a01b031633146107ea5760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260448201526064016104e2565b6001600160a01b03811661084f5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b60648201526084016104e2565b61085881610e30565b50565b6000610865610f2d565b9050610891337f0000000000000000000000000000000000000000000000000000000000000000610d51565b33600090815260086020526040902055565b6001600160a01b0383166109055760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b60648201526084016104e2565b6001600160a01b0382166109665760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b60648201526084016104e2565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b038381166000908152600160209081526040808320938616835292905220546000198114610a535781811015610a465760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e636500000060448201526064016104e2565b610a5384848484036108a3565b50505050565b6001600160a01b038316610abd5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b60648201526084016104e2565b6001600160a01b038216610b1f5760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b60648201526084016104e2565b6001600160a01b03831660009081526020819052604090205481811015610b975760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b60648201526084016104e2565b6001600160a01b03808516600090815260208190526040808220858503905591851681529081208054849290610bce90849061143c565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef84604051610c1a91815260200190565b60405180910390a3610a53565b6000306001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016148015610c8057507f000000000000000000000000000000000000000000000000000000000000000046145b15610caa57507f000000000000000000000000000000000000000000000000000000000000000090565b50604080517f00000000000000000000000000000000000000000000000000000000000000006020808301919091527f0000000000000000000000000000000000000000000000000000000000000000828401527f000000000000000000000000000000000000000000000000000000000000000060608301524660808301523060a0808401919091528351808403909101815260c0909201909252805191012090565b90565b6001600160a01b038216610da75760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f20616464726573730060448201526064016104e2565b8060026000828254610db9919061143c565b90915550506001600160a01b03821660009081526020819052604081208054839290610de690849061143c565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b600780546001600160a01b0383811673ffffffffffffffffffffffffffffffffffffffff19831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b03811660009081526005602052604090208054600181018255905b50919050565b6000610414610ec4610c27565b8360405161190160f01b6020820152602281018390526042810182905260009060620160405160208183030381529060405280519060200120905092915050565b6000806000610f1687878787610fcd565b91509150610f23816110ba565b5095945050505050565b336000908152600860205260409020544290610f6a907f00000000000000000000000000000000000000000000000000000000000000009061143c565b811015610d4e5760405162461bcd60e51b815260206004820152602b60248201527f45524332304661756365743a206d7573742077616974206265666f726520746160448201526a383834b7339030b3b0b4b760a91b60648201526084016104e2565b6000807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a083111561100457506000905060036110b1565b8460ff16601b1415801561101c57508460ff16601c14155b1561102d57506000905060046110b1565b6040805160008082526020820180845289905260ff881692820192909252606081018690526080810185905260019060a0016020604051602081039080840390855afa158015611081573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b0381166110aa576000600192509250506110b1565b9150600090505b94509492505050565b60008160048111156110ce576110ce61145d565b036110d65750565b60018160048111156110ea576110ea61145d565b036111375760405162461bcd60e51b815260206004820152601860248201527f45434453413a20696e76616c6964207369676e6174757265000000000000000060448201526064016104e2565b600281600481111561114b5761114b61145d565b036111985760405162461bcd60e51b815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e6774680060448201526064016104e2565b60038160048111156111ac576111ac61145d565b036112045760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202773272076616c604482015261756560f01b60648201526084016104e2565b60048160048111156112185761121861145d565b036108585760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202776272076616c604482015261756560f01b60648201526084016104e2565b600060208083528351808285015260005b8181101561129d57858101830151858201604001528201611281565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b03811681146112d557600080fd5b919050565b600080604083850312156112ed57600080fd5b6112f6836112be565b946020939093013593505050565b60008060006060848603121561131957600080fd5b611322846112be565b9250611330602085016112be565b9150604084013590509250925092565b60006020828403121561135257600080fd5b61135b826112be565b9392505050565b600080600080600080600060e0888a03121561137d57600080fd5b611386886112be565b9650611394602089016112be565b95506040880135945060608801359350608088013560ff811681146113b857600080fd5b9699959850939692959460a0840135945060c09093013592915050565b600080604083850312156113e857600080fd5b6113f1836112be565b91506113ff602084016112be565b90509250929050565b600181811c9082168061141c57607f821691505b602082108103610eb157634e487b7160e01b600052602260045260246000fd5b8082018082111561041457634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052602160045260246000fdfea264697066735822122031bad1aad7c87dcb56c198f81a0e4285d52ffb41d8f451180fdaf1694d94639564736f6c63430008100033';
const isSuperArgs = xs => xs.length > 1;
class ERC20Faucet__factory extends ethers_1.ContractFactory {
  constructor(...args) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }
  deploy(_name, _symbol, _tapAmount, _tapPeriod, overrides) {
    return super.deploy(
      _name,
      _symbol,
      _tapAmount,
      _tapPeriod,
      overrides || {}
    );
  }
  getDeployTransaction(_name, _symbol, _tapAmount, _tapPeriod, overrides) {
    return super.getDeployTransaction(
      _name,
      _symbol,
      _tapAmount,
      _tapPeriod,
      overrides || {}
    );
  }
  attach(address) {
    return super.attach(address);
  }
  connect(signer) {
    return super.connect(signer);
  }
  static createInterface() {
    return new ethers_1.utils.Interface(_abi);
  }
  static connect(address, signerOrProvider) {
    return new ethers_1.Contract(address, _abi, signerOrProvider);
  }
}
exports.ERC20Faucet__factory = ERC20Faucet__factory;
ERC20Faucet__factory.bytecode = _bytecode;
ERC20Faucet__factory.abi = _abi;
