FROM ubuntu:jammy
WORKDIR /app
ARG UBUNTU_MIRROR
ARG NPM_MIRROR
ARG COMMIT_HASH
# Replace sources list
# https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/
RUN echo "deb $UBUNTU_MIRROR jammy main restricted universe multiverse" > /etc/apt/sources.list && \
    echo "deb $UBUNTU_MIRROR jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
    echo "deb $UBUNTU_MIRROR jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list
# Install git and curl
RUN apt-get update && apt-get install -y git curl wget
# Install node.js 18.x
# https://nodejs.org/en/download/package-manager
# https://github.com/nodesource/distributions
RUN curl -fsSL https://deb.nodesource.com/setup_18.x -o ~/nodesource_setup.sh
RUN bash ~/nodesource_setup.sh
RUN apt-get install -y nodejs
## Use files of github stable release
RUN git clone https://githubfast.com/Hansimov/bili-search-ui.git . && git checkout $COMMIT_HASH
## Use files of local project files
# COPY . .
WORKDIR /app/quasar
RUN npm config set registry $NPM_MIRROR
RUN npm i -g @quasar/cli
RUN npm install
EXPOSE 9000
CMD ["quasar", "dev"]
