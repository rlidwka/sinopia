#!/bin/bash
if [ ! -f /opt/sinopia/volume/config.yaml ]; then
  cp /opt/sinopia/conf/docker.yaml /opt/sinopia/volume/config.yaml
fi
cat /opt/sinopia/volume/config.yaml
node /opt/sinopia/bin/sinopia --config /opt/sinopia/volume/config.yaml
