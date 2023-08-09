// interface of apollo
interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

// src/mocks/handlers.js
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
