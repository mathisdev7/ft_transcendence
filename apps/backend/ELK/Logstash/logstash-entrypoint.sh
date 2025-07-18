#!/bin/bash

set -e

echo "xpack.monitoring.enabled: false" >> /usr/share/logstash/config/logstash.yml
echo "xpack.monitoring.elasticsearch.hosts: [\"${ELASTICSEARCH_HOSTS}\"]" >> /usr/share/logstash/config/logstash.yml
echo "xpack.monitoring.elasticsearch.username: ${ELASTICSEARCH_USERNAME}" >> /usr/share/logstash/config/logstash.yml
echo "xpack.monitoring.elasticsearch.password: ${ELASTICSEARCH_PASSWORD}" >> /usr/share/logstash/config/logstash.yml

/usr/local/bin/docker-entrypoint
