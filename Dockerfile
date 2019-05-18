FROM node:10

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY package*.json ./
COPY config ./

RUN ulimit -a
RUN npm install

CMD [ "npm", "start" ]
