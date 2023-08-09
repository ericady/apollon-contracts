import Test from './components/Test';

export default function Home() {
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    import('../mocks').then((module) => {
      module.default();
    });
  }

  return (
    <main>
      <Test />
    </main>
  );
}
