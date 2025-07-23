FROM docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Switch to root to install and configure
USER root

COPY Elasticsearch/elasticsearch-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/elasticsearch-entrypoint.sh

# Create certs directory and set permissions
RUN mkdir -p /usr/share/elasticsearch/config/certs

# Ensure the elasticsearch user exists and has proper permissions
RUN chown -R 1000:0 /usr/share/elasticsearch
RUN chown 1000:0 /usr/local/bin/elasticsearch-entrypoint.sh

# Switch back to elasticsearch user
USER 1000

ENTRYPOINT ["/usr/local/bin/elasticsearch-entrypoint.sh"]
