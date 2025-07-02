#!/bin/bash

# start ES in background
./bin/elasticsearch &

# wait ES to be UP
until curl -k -u elastic:$ELASTIC_PASSWORD https://localhost:9200; do
  echo "Waiting for Elasticsearch to start..."
  sleep 5
done



# Reset passwords via REST API
curl -k -X PUT "https://localhost:9200/_security/user/kibana_system/_password" \
     -H "Content-Type: application/json" \
     -u elastic:$ELASTIC_PASSWORD \
     -d '{"password": "'"$KIBANA_PASSWORD"'"}'

curl -k -X PUT "https://localhost:9200/_security/user/logstash_system/_password" \
     -H "Content-Type: application/json" \
     -u elastic:$ELASTIC_PASSWORD \
     -d '{"password": "'"$LOGSTASH_PASSWORD"'"}'
