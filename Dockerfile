FROM node:current

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY package*.json ./
#COPY config ./
COPY inbox2matrix.js ./

RUN npm install

CMD [ "npm", "start" ]
