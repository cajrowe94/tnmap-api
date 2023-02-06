FROM node:16-alpine
RUN mkdir -p /app
WORKDIR /app
COPY package.json /app
COPY . /app
ENV NODE_PATH /app/node_modules
RUN npm install
CMD ["npm", "start"]
