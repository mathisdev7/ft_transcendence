#!/bin/bash

# start ES in background
./bin/elasticsearch &

# wait ES to be UP
until curl -k -u elastic:$ELASTIC_PASSWORD https://localhost:9200; do
  echo "Waiting for Elasticsearch to start..."
  sleep 5
done

# Create users

# Définir les mots de passe des comptes système
bin/elasticsearch-reset-password -u kibana_system -i -b -s -f -p "$KIBANA_PASSWORD"
bin/elasticsearch-reset-password -u logstash_system -i -b -s -f -p "$LOGSTASH_PASSWORD"

# Attendre le processus principal Elasticsearch
wait
