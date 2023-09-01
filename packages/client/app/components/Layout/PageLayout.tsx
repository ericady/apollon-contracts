import { PropsWithChildren } from 'react';

function PageLayout({ children }: PropsWithChildren<{}>) {
  return <div style={{ width: '100%', padding: '20px 250px 0 250px' }}>{children}</div>;
}

export default PageLayout;
