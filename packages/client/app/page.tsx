import Login from './components/Login.tsx/Login';
import Test from './components/Test';
import EthersProvider from './context/EthersProvider';

export default function Home() {
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    import('../mocks').then((module) => {
      module.default();
    });
  }

  return (
    <main>
      <EthersProvider>
        <Test />
        <Login />
      </EthersProvider>
    </main>
  );
}
