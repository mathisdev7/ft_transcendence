#!/bin/bash

set -e

echo "server.host: 0.0.0.0" >> /usr/share/kibana/config/kibana.yml
echo "elasticsearch.hosts: [\"${ELASTICSEARCH_HOSTS}\"]" >> /usr/share/kibana/config/kibana.yml
echo "elasticsearch.username: ${ELASTICSEARCH_USERNAME}" >> /usr/share/kibana/config/kibana.yml
echo "elasticsearch.password: ${ELASTICSEARCH_PASSWORD}" >> /usr/share/kibana/config/kibana.yml
echo "elasticsearch.ssl.verificationMode: none" >> /usr/share/kibana/config/kibana.yml

/usr/local/bin/kibana-docker
