#!/bin/bash

# This script has to be use only once.
# Need a cmd in Makefile to check if the folder "certs" exist. If not, call this script
# To do even better we could split in different folder to give 3 different volumes instead of the same for E, L, K
# It will create the SSL certificate and be passed as Volume later on

# stop script if one command fails
set -e

# Create certificates directory if it doesn't exist
mkdir -p ./certs

# Generate CA private key
openssl genrsa -out ./certs/ca-key.pem 4096

# Verify CA private key was created
if [ ! -f ./certs/ca-key.pem ]; then
    echo "Error: CA private key generation failed"
    exit 1
fi

# Generate CA certificate
openssl req -new -x509 -key ./certs/ca-key.pem -out ./certs/ca-cert.pem -days 3650 -subj "/CN=Elasticsearch CA"

# Verify CA certificate was created
if [ ! -f ./certs/ca-cert.pem ]; then
    echo "Error: CA certificate generation failed"
    exit 1
fi

# Generate Elasticsearch private key
openssl genrsa -out ./certs/elasticsearch-key.pem 4096

# Verify Elasticsearch private key was created
if [ ! -f ./certs/elasticsearch-key.pem ]; then
    echo "Error: Elasticsearch private key generation failed"
    exit 1
fi

# Create config file for certificate with SAN
cat > ./certs/elasticsearch.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = elasticsearch

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = elasticsearch
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# Generate Elasticsearch certificate signing request
openssl req -new -key ./certs/elasticsearch-key.pem -out ./certs/elasticsearch.csr -config ./certs/elasticsearch.conf

# Verify CSR was created and CA files exist
if [ ! -f ./certs/elasticsearch.csr ]; then
    echo "Error: Elasticsearch CSR generation failed"
    exit 1
fi
if [ ! -f ./certs/ca-cert.pem ] || [ ! -f ./certs/ca-key.pem ]; then
    echo "Error: CA files not found"
    exit 1
fi

# Generate Elasticsearch certificate signed by CA
openssl x509 -req -in ./certs/elasticsearch.csr -CA ./certs/ca-cert.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/elasticsearch-cert.pem -days 365 -extensions v3_req -extfile ./certs/elasticsearch.conf

# Generate Kibana private key
openssl genrsa -out ./certs/kibana-key.pem 4096

# Verify Kibana private key was created
if [ ! -f ./certs/kibana-key.pem ]; then
    echo "Error: Kibana private key generation failed"
    exit 1
fi

# Create config file for Kibana certificate
cat > ./certs/kibana.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = kibana

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = kibana
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# Generate Kibana certificate signing request
openssl req -new -key ./certs/kibana-key.pem -out ./certs/kibana.csr -config ./certs/kibana.conf

# Verify CSR was created and CA files exist
if [ ! -f ./certs/kibana.csr ]; then
    echo "Error: Kibana CSR generation failed"
    exit 1
fi
if [ ! -f ./certs/ca-cert.pem ] || [ ! -f ./certs/ca-key.pem ]; then
    echo "Error: CA files not found"
    exit 1
fi

# Generate Kibana certificate signed by CA
openssl x509 -req -in ./certs/kibana.csr -CA ./certs/ca-cert.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/kibana-cert.pem -days 365 -extensions v3_req -extfile ./certs/kibana.conf

# Generate Logstash private key
openssl genrsa -out ./certs/logstash-key.pem 4096

# Verify Logstash private key was created
if [ ! -f ./certs/logstash-key.pem ]; then
    echo "Error: Logstash private key generation failed"
    exit 1
fi

# Create config file for Logstash certificate
cat > ./certs/logstash.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = logstash

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = logstash
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# Generate Logstash certificate signing request
openssl req -new -key ./certs/logstash-key.pem -out ./certs/logstash.csr -config ./certs/logstash.conf

# Verify CSR was created and CA files exist
if [ ! -f ./certs/logstash.csr ]; then
    echo "Error: Logstash CSR generation failed"
    exit 1
fi
if [ ! -f ./certs/ca-cert.pem ] || [ ! -f ./certs/ca-key.pem ]; then
    echo "Error: CA files not found"
    exit 1
fi

# Generate Logstash certificate signed by CA
openssl x509 -req -in ./certs/logstash.csr -CA ./certs/ca-cert.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/logstash-cert.pem -days 365 -extensions v3_req -extfile ./certs/logstash.conf

# Set proper permissions
chmod 644 ./certs/*.pem
chmod 600 ./certs/*-key.pem

echo "Certificates generated successfully in ./certs/"
ls -la ./certs/
