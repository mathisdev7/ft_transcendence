# ELK Stack Configuration

## COMMANDS
# Start
docker-compose up -d
# Stop
docker-compose down
# Test
curl -s http://localhost:9200/_cluster/health?pretty
# Status
docker-compose ps
# Logs
docker-compose logs -f elasticsearch

## Direct tests
curl http://localhost:9200                    # Cluster Info
curl http://localhost:9200/_cluster/health    # Cluster Health
curl http://localhost:9200/_cat/indices       # Indice List
