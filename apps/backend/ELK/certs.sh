#!/bin/bash

set -e

mkdir -p certs/ca certs/elasticsearch certs/kibana certs/logstash

# --- Create CA ---
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout certs/ca/ca.key -out certs/ca/ca.crt \
  -subj "/C=FR/L=Perpignan/O=42_Perpignan/CN=elkCA"

# --- Function to create config with SAN ---
generate_openssl_config() {
  local cn=$1
  local dns1=$2
  local dns2=$3
  local ip1=$4
  cat > "${cn}.cnf" <<EOF
[req]
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

[alt_names]
DNS.1 = $dns1
DNS.2 = $dns2
IP.1 = $ip1
EOF
}

# --- Elasticsearch cert ---
generate_openssl_config "elasticsearch" "elasticsearch" "localhost" "127.0.0.1"
openssl req -newkey rsa:4096 -nodes \
  -keyout certs/elasticsearch/elasticsearch.key -out certs/elasticsearch/elasticsearch.csr \
  -config elasticsearch.cnf

openssl x509 -req -in certs/elasticsearch/elasticsearch.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
  -CAcreateserial -out certs/elasticsearch/elasticsearch.crt -days 365 -sha256 \
  -extfile elasticsearch.cnf -extensions v3_req

# --- Kibana cert ---
generate_openssl_config "kibana" "kibana" "localhost" "127.0.0.1"
openssl req -newkey rsa:4096 -nodes \
  -keyout certs/kibana/kibana.key -out certs/kibana/kibana.csr \
  -config kibana.cnf

openssl x509 -req -in certs/kibana/kibana.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
  -CAcreateserial -out certs/kibana/kibana.crt -days 365 -sha256 \
  -extfile kibana.cnf -extensions v3_req

# --- Logstash cert ---
generate_openssl_config "logstash" "logstash" "localhost" "127.0.0.1"
openssl req -newkey rsa:4096 -nodes \
  -keyout certs/logstash/logstash.key -out certs/logstash/logstash.csr \
  -config logstash.cnf

openssl x509 -req -in certs/logstash/logstash.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
  -CAcreateserial -out certs/logstash/logstash.crt -days 365 -sha256 \
  -extfile logstash.cnf -extensions v3_req

# --- Copy certs for convenience ---
cp certs/elasticsearch/elasticsearch.key certs/
cp certs/elasticsearch/elasticsearch.crt certs/
cp certs/ca/ca.crt certs/

# --- Permissions ---
chmod 644 certs/*.crt certs/*.key
chown 1000:0 certs/*.crt certs/*.key

# --- Cleanup config files ---
rm elasticsearch.cnf kibana.cnf logstash.cnf

echo "Certificates generated with SAN successfully."
