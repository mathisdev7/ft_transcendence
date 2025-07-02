#!/bin/bash

mkdir -p certs/ca certs/elasticsearch certs/kibana certs/logstash

# Create CA
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout certs/ca/ca.key -out certs/ca/ca.crt \
  -subj "/C=FR/L=Perpignan/O=42_Perpignan/CN=elkCA"


# Elastisearch

# Certificate Signing Request
openssl req -newkey rsa:4096 -nodes \
  -keyout certs/elasticsearch/elasticsearch.key -out certs/elasticsearch/elasticsearch.csr \
  -subj "/C=FR/L=Perpignan/O=42_Perpignan/CN=elasticsearch"
# CSR signed by CA
openssl x509 -req -in certs/elasticsearch/elasticsearch.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
  -CAcreateserial -out certs/elasticsearch/elasticsearch.crt -days 365 -sha256


# Kibana

# Certificate Signing Request
openssl req -newkey rsa:4096 -nodes \
  -keyout certs/kibana/kibana.key -out certs/kibana/kibana.csr \
  -subj "/C=FR/L=Perpignan/O=42_Perpignan/CN=kibana"
# CSR signed by CA
openssl x509 -req -in certs/kibana/kibana.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
  -CAcreateserial -out certs/kibana/kibana.crt -days 365 -sha256


# logstash

# Certificate Signing Request
openssl req -newkey rsa:4096 -nodes \
  -keyout certs/logstash/logstash.key -out certs/logstash/logstash.csr \
  -subj "/C=FR/L=Perpignan/O=42_Perpignan/CN=logstash"
# CSR signed by CA
openssl x509 -req -in certs/logstash/logstash.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
  -CAcreateserial -out certs/logstash/logstash.crt -days 365 -sha256
