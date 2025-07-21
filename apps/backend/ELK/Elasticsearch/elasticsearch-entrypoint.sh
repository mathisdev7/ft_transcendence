#!/bin/bash

set -e

if [ -z "$ELASTIC_PASSWORD" ]; then
  echo "ELASTIC_PASSWORD not set"
  exit 1
fi

echo "Starting Elasticsearch..."
/usr/local/bin/docker-entrypoint.sh eswrapper &
ES_PID=$!

echo "Waiting for Elasticsearch to start..."
until curl -s -k -u elastic:$ELASTIC_PASSWORD https://localhost:9200/_cluster/health; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 5
done

echo "Elasticsearch is ready!"

echo "Creating Kibana system user..."
curl -X POST -u elastic:$ELASTIC_PASSWORD \
  -H "Content-Type: application/json" \
  -k https://localhost:9200/_security/user/kibana_system/_password \
  -d "{\"password\": \"$KIBANA_SYSTEM_PASSWORD\"}"

echo "Creating Logstash role..."
curl -X POST -u elastic:$ELASTIC_PASSWORD \
  -H "Content-Type: application/json" \
  -k https://localhost:9200/_security/role/logstash_writer \
  -d '{
    "cluster": ["manage_index_templates", "monitor", "manage_ilm"],
    "indices": [
      {
        "names": ["logstash-*"],
        "privileges": ["write", "create", "create_index", "manage", "manage_ilm"]
      }
    ]
  }'

echo "Creating Logstash user..."
curl -X POST -u elastic:$ELASTIC_PASSWORD \
  -H "Content-Type: application/json" \
  -k https://localhost:9200/_security/user/logstash \
  -d "{
    \"roles\": [\"logstash_writer\"],
    \"full_name\": \"Logstash User\",
    \"email\": \"logstash@example.com\",
    \"password\": \"$LOGSTASH_PASSWORD\"
  }"

echo "Setup complete. Keeping Elasticsearch running..."
wait $ES_PID
