// interface of apollo
interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

import { graphql } from 'msw';

export const handlers = [
  // Just a demo query
  graphql.query('GetUserInfo', (req, res, ctx) =>
    res(
      ctx.data({
        user: {
          __typename: 'User',
          firstName: 'John',
        },
      }),
    ),
  ),
];
