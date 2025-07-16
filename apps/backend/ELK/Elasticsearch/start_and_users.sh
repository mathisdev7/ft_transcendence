#!/bin/bash

echo "Starting Elasticsearch with custom configuration..."

chmod +x /usr/share/elasticsearch/start_and_users.sh

echo "Starting Elasticsearch..."
./bin/elasticsearch &

echo "Waiting for Elasticsearch to be ready..."
while true; do
  if curl -s http://localhost:9200 >/dev/null 2>&1; then
    echo "✅ Elasticsearch is ready! Connection successful"
    break
  else
    echo "⏳ Waiting for Elasticsearch to start..."
    sleep 5
  fi
done

echo "📊 Cluster information:"
curl -s http://localhost:9200/_cluster/health?pretty

echo ""
echo "🎯 Elasticsearch is fully ready for connections!"
echo "🌐 Access Elasticsearch at: http://localhost:9200"
echo "📚 Cluster name: transcendence"
echo "🖥️  Node name: node-1"

wait
