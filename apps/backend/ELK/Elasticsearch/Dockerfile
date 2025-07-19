FROM docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Switch to root to install and configure
USER root

COPY Elasticsearch/elasticsearch-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/elasticsearch-entrypoint.sh

COPY certs/generate-certs.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/generate-certs.sh

# Copy SSL certificates
COPY certs/ca-cert.pem /usr/share/elasticsearch/config/certs/
COPY certs/elasticsearch-cert.pem /usr/share/elasticsearch/config/certs/
COPY certs/elasticsearch-key.pem /usr/share/elasticsearch/config/certs/

# Create certs directory and set permissions
RUN mkdir -p /usr/share/elasticsearch/config/certs

# Ensure the elasticsearch user exists and has proper permissions
RUN chown -R 1000:0 /usr/share/elasticsearch
RUN chown 1000:0 /usr/local/bin/elasticsearch-entrypoint.sh
RUN chmod 644 /usr/share/elasticsearch/config/certs/*.pem
RUN chmod 600 /usr/share/elasticsearch/config/certs/elasticsearch-key.pem

# Switch back to elasticsearch user
USER 1000

ENTRYPOINT ["/usr/local/bin/elasticsearch-entrypoint.sh"]
