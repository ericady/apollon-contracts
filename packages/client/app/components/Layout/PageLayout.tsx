import { PropsWithChildren } from 'react';

function PageLayout({ children }: PropsWithChildren<{}>) {
  return <div style={{ width: '100%', padding: '20px 270px 0 270px' }}>{children}</div>;
}

export default PageLayout;
