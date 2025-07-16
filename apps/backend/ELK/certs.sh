#!/bin/bash

set -e

mkdir -p certs/ca certs/elasticsearch certs/kibana certs/logstash

# --- Create CA ---
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout certs/ca/ca.key -out certs/ca/ca.crt \
  -subj "/C=FR/L=Perpignan/O=42_Perpignan/CN=elkCA"

# --- Function to create openssl config with SAN ---
generate_openssl_config() {
  local cn=$1
  shift
  local alt_names=("$@")

  echo "[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = FR
L = Perpignan
O = 42_Perpignan
CN = $cn

[v3_req]
subjectAltName = @alt_names

[alt_names]" > "${cn}.cnf"

  local i=1
  for name in "${alt_names[@]}"; do
    if [[ $name =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      # IP address
      echo "IP.$i = $name" >> "${cn}.cnf"
    else
      # DNS name
      echo "DNS.$i = $name" >> "${cn}.cnf"
    fi
    ((i++))
  done
}

# --- Generate config and certs for Elasticsearch ---
generate_openssl_config "elasticsearch" "elasticsearch" "localhost" "127.0.0.1" "172.18.0.2"
openssl req -newkey rsa:4096 -nodes -keyout certs/elasticsearch/elasticsearch.key -out certs/elasticsearch/elasticsearch.csr -config elasticsearch.cnf
openssl x509 -req -in certs/elasticsearch/elasticsearch.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key -CAcreateserial -out certs/elasticsearch/elasticsearch.crt -days 365 -sha256 -extfile elasticsearch.cnf -extensions v3_req
# --concatene car pb
cat certs/elasticsearch/elasticsearch.crt certs/ca/ca.crt > certs/elasticsearch/elasticsearch-chain.crt

# --- Generate config and certs for Kibana ---
generate_openssl_config "kibana" "kibana" "localhost" "127.0.0.1"
openssl req -newkey rsa:4096 -nodes -keyout certs/kibana/kibana.key -out certs/kibana/kibana.csr -config kibana.cnf
openssl x509 -req -in certs/kibana/kibana.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key -CAcreateserial -out certs/kibana/kibana.crt -days 365 -sha256 -extfile kibana.cnf -extensions v3_req

# --- Generate config and certs for Logstash ---
generate_openssl_config "logstash" "logstash" "localhost" "127.0.0.1"
openssl req -newkey rsa:4096 -nodes -keyout certs/logstash/logstash.key -out certs/logstash/logstash.csr -config logstash.cnf
openssl x509 -req -in certs/logstash/logstash.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key -CAcreateserial -out certs/logstash/logstash.crt -days 365 -sha256 -extfile logstash.cnf -extensions v3_req


chmod 644 certs/elasticsearch/*.crt certs/elasticsearch/*.key
chown 1000:0 certs/elasticsearch/*.crt certs/elasticsearch/*.key
