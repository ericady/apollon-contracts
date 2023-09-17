import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import { Metadata } from 'next/types';
import ContextWrapper from './context/ContextWrapper';
import './styles.css';

export const metadata: Metadata = {
  title: 'Apollon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </head>
      <body>
        <ContextWrapper>
          <main>{children}</main>
        </ContextWrapper>
      </body>
    </html>
  );
}
