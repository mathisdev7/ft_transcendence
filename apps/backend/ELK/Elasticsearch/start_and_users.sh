#!/bin/bash

# start ES in background
./bin/elasticsearch &

# wait ES to be UP
while true; do
  if curl -k -u elastic:"$ELASTIC_PASSWORD" https://localhost:9200 >/dev/null 2>&1; then
    echo "Connexion réussie avec le mot de passe : $ELASTIC_PASSWORD"
    break
  else
    echo "Échec de la connexion, mot de passe ou Elasticsearch non disponible. Waiting..."
    sleep 5
  fi
done

# echo $ELASTIC_PASSWORD
# echo $ELASTIC_PASSWORD
# echo $ELASTIC_PASSWORD
# echo $ELASTIC_PASSWORD
# # Create users
# bin/elasticsearch-users useradd kibana_system -p "$KIBANA_PASSWORD" -r kibana_system
# bin/elasticsearch-users useradd logstash_system -p "$LOGSTASH_PASSWORD" -r logstash_system

# # Attendre le processus principal Elasticsearch
wait




# bin/elasticsearch-reset-password -u elastic


# # Reset passwords via REST API
# curl -k -X PUT "https://localhost:9200/_security/user/kibana_system/_password" \
#      -H "Content-Type: application/json" \
#      -u elastic:$ELASTIC_PASSWORD \
#      -d '{"password": "'"$KIBANA_PASSWORD"'"}'

# curl -k -X PUT "https://localhost:9200/_security/user/logstash_system/_password" \
#      -H "Content-Type: application/json" \
#      -u elastic:$ELASTIC_PASSWORD \
#      -d '{"password": "'"$LOGSTASH_PASSWORD"'"}'
