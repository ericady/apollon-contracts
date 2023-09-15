import { PropsWithChildren } from 'react';

function PageLayout({ children }: PropsWithChildren<{}>) {
  return <div style={{ width: '100%', padding: '20px 15% 0 15%' }}>{children}</div>;
}

export default PageLayout;
