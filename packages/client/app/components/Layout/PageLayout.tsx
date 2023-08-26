import { PropsWithChildren } from 'react';

function PageLayout({ children }: PropsWithChildren<{}>) {
  return <div style={{ width: '100%', margin: '20px 80px 0 80px' }}>{children}</div>;
}

export default PageLayout;
