FROM node:16
RUN npm install -g nodemon
RUN mkdir -p /app
WORKDIR /app
COPY . /app
RUN npm install
ENV NODE_PATH /app/node_modules
CMD ["npm", "run", "dev"]
