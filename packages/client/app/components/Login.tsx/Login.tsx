'use client';

import { useEthers } from '../../context/EthersProvider';

function Login() {
  const { connectWallet, address, loginError } = useEthers();

  return (
    <div>
      <button onClick={connectWallet}>Connect to MetaMask</button>
      <p>Address: {address}</p>
      <p>Error loging in: {loginError}</p>
    </div>
  );
}

export default Login;
