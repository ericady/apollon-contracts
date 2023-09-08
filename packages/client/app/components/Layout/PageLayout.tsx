import { PropsWithChildren } from 'react';

function PageLayout({ children }: PropsWithChildren<{}>) {
  return <div style={{ width: '100%', padding: '20px 330px 0 330px' }}>{children}</div>;
}

export default PageLayout;
