#!/bin/bash

# start ES in background
./bin/elasticsearch &

# wait ES to be UP
until curl -k -u elastic:$ELASTIC_PASSWORD https://localhost:9200; do
  echo "Waiting for Elasticsearch to start..."
  sleep 5
done

# Create users
bin/elasticsearch-users useradd kibana_system -p "$KIBANA_PASSWORD" -r kibana_system
bin/elasticsearch-users useradd logstash_system -p "$LOGSTASH_PASSWORD" -r logstash_system

# Attendre le processus principal Elasticsearch
wait
