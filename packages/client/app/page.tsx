import Test from './components/Test';
import styles from './page.module.css';

export default function Home() {
  if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    import('../mocks').then((module) => {
      module.default();
    });
  }

  return (
    <main className={styles.main}>
      <Test />
    </main>
  );
}
