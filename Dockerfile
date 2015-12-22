FROM node:4.2
RUN mkdir -p /opt/sinopia && mkdir -p /opt/sinopia/volume
WORKDIR /opt/sinopia
RUN npm install -g yapm
ADD package.yaml /opt/sinopia/
RUN yapm install
ADD . /opt/sinopia
CMD ["/opt/sinopia/docker/start.sh"]
EXPOSE 4873
VOLUME /opt/sinopia/volume
