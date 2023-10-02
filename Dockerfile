###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:18-alpine As build

# Create app directory
WORKDIR /usr/src/app
RUN apk add --no-cache bash
RUN yarn set version 3.5.1
RUN yarn plugin import workspace-tools
# Copying required files for installing dependencies
COPY --chown=node:node package.json .yarnrc.yml yarn.lock .yarn/ ./
COPY --chown=node:node packages/graph-data-service/package.json ./packages/graph-data-service/

# Install app dependencies without modifiying lock file
# RUN yarn install --immutable --immutable-cache 
RUN yarn install 

# Bundle app source
COPY --chown=node:node packages/graph-data-service ./packages/graph-data-service

# # Run the build command which creates the production bundle
RUN yarn workspace graph-data-service build

# # Set NODE_ENV environment variable
ENV NODE_ENV production

# # Install production dependencies only and clean cache for smaller package
RUN yarn workspaces focus --all --production && yarn cache clean

# # Use the node user from the image (instead of the root user)
USER node

###################
# BUILD FOR PRODUCTION
###################

# FROM node:18-alpine As build

# WORKDIR /usr/src/app
# RUN yarn set version 3.5.1

# # In order to run `npm run build` we need access to the Nest CLI which is a dev dependency. In the previous development stage we ran `yarn install` which installed all dependencies, so we can copy over the node_modules directory from the development image
# COPY --chown=node:node package.json yarn.lock ./
# COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules
# COPY --chown=node:node ./packages/graph-data-service ./packages/graph-data-service
# COPY --chown=node:node --from=development /usr/src/app/packages/graph-data-service/node_modules ./packages/graph-data-service/node_modules

# # Run the build command which creates the production bundle
# RUN yarn workspace graph-data-service build

# # Set NODE_ENV environment variable
# ENV NODE_ENV production

# # Install production dependencies only and clean cache for smaller package
# RUN yarn workspaces focus --production && yarn cache clean

# USER node

# ###################
# # PRODUCTION
# ###################

FROM node:18-alpine As production

WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/packages/graph-data-service/node_modules ./packages/graph-data-service/node_modules
COPY --chown=node:node --from=build /usr/src/app/packages/graph-data-service/dist ./packages/graph-data-service/dist
COPY --chown=node:node packages/graph-data-service/src/schema.gql ./packages/graph-data-service/dist/

EXPOSE 8081

# Start the server using the production build
CMD [ "node", "packages/graph-data-service/dist/main.js" ]