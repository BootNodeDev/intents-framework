FROM node:20-alpine

# Bundle APP files
WORKDIR /workspace
COPY .  ./
RUN corepack enable
RUN yarn install
RUN yarn build:solver
RUN npm install pm2 -g

# Show current folder structure in logs
RUN ls -al -R

CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]
