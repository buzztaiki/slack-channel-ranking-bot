FROM node:latest

RUN mkdir -p /usr/local/app
WORKDIR /usr/local/app

COPY ./ ./
RUN yarn install
RUN yarn run build

ENTRYPOINT ["node", "./dist/index.js"]
