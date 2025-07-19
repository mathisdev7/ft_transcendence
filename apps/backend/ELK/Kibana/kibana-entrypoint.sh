#!/bin/bash

set -e

# Remove existing configuration file and create a new one
cat > /usr/share/kibana/config/kibana.yml << EOF
server.host: 0.0.0.0
elasticsearch.hosts: ["${ELASTICSEARCH_HOSTS}"]
elasticsearch.username: ${ELASTICSEARCH_USERNAME}
elasticsearch.password: ${ELASTICSEARCH_PASSWORD}
elasticsearch.ssl.verificationMode: none
EOF

/usr/local/bin/kibana-docker
