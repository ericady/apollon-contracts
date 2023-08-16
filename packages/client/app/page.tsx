import Assets from './components/Features/Assets/Assets';
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
        <div style={{ height: '100vh', width: '100vw', display: 'gird', placeItems: 'center' }}>
          <Assets />
        </div>
      </EthersProvider>
    </main>
  );
}
