FROM node:22-slim

# set working directory
RUN mkdir -p /home/gbq-auth
WORKDIR /home/gbq-auth
ENV HOME=/home/gbq-auth

# allow mounting credentials volume
RUN mkdir -p /credentials && ln -s /credentials /home/gbq-auth/credentials
VOLUME /credentials

# install application dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm ci

# add entrypoint script
COPY docker-image-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# add script
COPY api ./api/

# start the server when the container starts
ENTRYPOINT ["/entrypoint.sh"]
