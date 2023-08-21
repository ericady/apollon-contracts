import { MockedProvider } from '@apollo/client/testing';
import { PropsWithChildren } from 'react';

export const IntegrationWrapper = ({ children }: PropsWithChildren<{}>) => <MockedProvider>{children}</MockedProvider>;
