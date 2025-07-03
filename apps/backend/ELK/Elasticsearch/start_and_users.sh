!/bin/bash

# start ES in background
./bin/elasticsearch &

# wait ES to be UP
until curl -k -u elastic:$ELASTIC_PASSWORD https://localhost:9200; do
  echo "Le mot de passe est : $ELASTIC_PASSWORD"
  echo "Waiting for Elasticsearch to start..."
  sleep 5
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
