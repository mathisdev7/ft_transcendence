#!/bin/bash

echo "Creating logstash_writer role..."
curl -u elastic:mdp123 -X POST "http://localhost:9200/_security/role/logstash_writer" -H 'Content-Type: application/json' -d '{
  "cluster": ["monitor", "manage_index_templates", "cluster:admin/ingest/pipeline/put", "cluster:admin/ingest/pipeline/get"],
  "indices": [
    {
      "names": ["transcendence-logs-*", "logstash-*"],
      "privileges": ["write", "create", "create_index", "manage", "delete_index"]
    }
  ]
}'

curl -u elastic:mdp123 -X POST "http://localhost:9200/_security/user/logstash" -H 'Content-Type: application/json' -d '{
  "password": "mdp123",
  "roles": ["logstash_writer"],
  "full_name": "Logstash System User",
  "email": "logstash@transcendence.local"
}'

curl -u elastic:mdp123 -X POST "http://localhost:9200/_security/user/kibana_system/_password" -H 'Content-Type: application/json' -d '{
	"password": "mdp123"
}'

docker-compose restart kibana
docker-compose restart logstash
