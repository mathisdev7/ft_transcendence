#!/bin/bash

set -e

# Create certificates directory if it doesn't exist
mkdir -p /tmp/certs

# Generate CA private key
openssl genrsa -out /tmp/certs/ca-key.pem 4096

# Verify CA private key was created
if [ ! -f /tmp/certs/ca-key.pem ]; then
    echo "Error: CA private key generation failed"
    exit 1
fi

# Generate CA certificate
openssl req -new -x509 -key /tmp/certs/ca-key.pem -out /tmp/certs/ca-cert.pem -days 3650 -subj "/CN=Elasticsearch CA"

# Verify CA certificate was created
if [ ! -f /tmp/certs/ca-cert.pem ]; then
    echo "Error: CA certificate generation failed"
    exit 1
fi

# Generate Elasticsearch private key
openssl genrsa -out /tmp/certs/elasticsearch-key.pem 4096

# Verify Elasticsearch private key was created
if [ ! -f /tmp/certs/elasticsearch-key.pem ]; then
    echo "Error: Elasticsearch private key generation failed"
    exit 1
fi

# Create config file for certificate with SAN
cat > /tmp/certs/elasticsearch.conf << EOF
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
openssl req -new -key /tmp/certs/elasticsearch-key.pem -out /tmp/certs/elasticsearch.csr -config /tmp/certs/elasticsearch.conf

# Verify CSR was created and CA files exist
if [ ! -f /tmp/certs/elasticsearch.csr ]; then
    echo "Error: Elasticsearch CSR generation failed"
    exit 1
fi
if [ ! -f /tmp/certs/ca-cert.pem ] || [ ! -f /tmp/certs/ca-key.pem ]; then
    echo "Error: CA files not found"
    exit 1
fi

# Generate Elasticsearch certificate signed by CA
openssl x509 -req -in /tmp/certs/elasticsearch.csr -CA /tmp/certs/ca-cert.pem -CAkey /tmp/certs/ca-key.pem -CAcreateserial -out /tmp/certs/elasticsearch-cert.pem -days 365 -extensions v3_req -extfile /tmp/certs/elasticsearch.conf

# Generate Kibana private key
openssl genrsa -out /tmp/certs/kibana-key.pem 4096

# Verify Kibana private key was created
if [ ! -f /tmp/certs/kibana-key.pem ]; then
    echo "Error: Kibana private key generation failed"
    exit 1
fi

# Create config file for Kibana certificate
cat > /tmp/certs/kibana.conf << EOF
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
openssl req -new -key /tmp/certs/kibana-key.pem -out /tmp/certs/kibana.csr -config /tmp/certs/kibana.conf

# Verify CSR was created and CA files exist
if [ ! -f /tmp/certs/kibana.csr ]; then
    echo "Error: Kibana CSR generation failed"
    exit 1
fi
if [ ! -f /tmp/certs/ca-cert.pem ] || [ ! -f /tmp/certs/ca-key.pem ]; then
    echo "Error: CA files not found"
    exit 1
fi

# Generate Kibana certificate signed by CA
openssl x509 -req -in /tmp/certs/kibana.csr -CA /tmp/certs/ca-cert.pem -CAkey /tmp/certs/ca-key.pem -CAcreateserial -out /tmp/certs/kibana-cert.pem -days 365 -extensions v3_req -extfile /tmp/certs/kibana.conf

# Generate Logstash private key
openssl genrsa -out /tmp/certs/logstash-key.pem 4096

# Verify Logstash private key was created
if [ ! -f /tmp/certs/logstash-key.pem ]; then
    echo "Error: Logstash private key generation failed"
    exit 1
fi

# Create config file for Logstash certificate
cat > /tmp/certs/logstash.conf << EOF
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
openssl req -new -key /tmp/certs/logstash-key.pem -out /tmp/certs/logstash.csr -config /tmp/certs/logstash.conf

# Verify CSR was created and CA files exist
if [ ! -f /tmp/certs/logstash.csr ]; then
    echo "Error: Logstash CSR generation failed"
    exit 1
fi
if [ ! -f /tmp/certs/ca-cert.pem ] || [ ! -f /tmp/certs/ca-key.pem ]; then
    echo "Error: CA files not found"
    exit 1
fi

# Generate Logstash certificate signed by CA
openssl x509 -req -in /tmp/certs/logstash.csr -CA /tmp/certs/ca-cert.pem -CAkey /tmp/certs/ca-key.pem -CAcreateserial -out /tmp/certs/logstash-cert.pem -days 365 -extensions v3_req -extfile /tmp/certs/logstash.conf

# Set proper permissions
chmod 644 /tmp/certs/*.pem
chmod 600 /tmp/certs/*-key.pem

echo "Certificates generated successfully in /tmp/certs/"
ls -la /tmp/certs/
