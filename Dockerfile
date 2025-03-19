FROM node:20-alpine

# Bundle APP files
WORKDIR /workspace
COPY .  ./
RUN corepack enable
RUN yarn install
RUN yarn build:solver
RUN npm install pm2 -g

# Copy the solvers.json configuration file to the dist directory since it's dynamically imported and not processed by TypeScript compiler
RUN cp ./typescript/solver/config/solvers.json ./typescript/solver/dist/config/solvers.json

# Show current folder structure in logs
RUN ls -al -R

CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]
