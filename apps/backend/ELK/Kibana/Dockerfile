FROM docker.elastic.co/kibana/kibana:8.11.0

USER root
COPY Kibana/kibana-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/kibana-entrypoint.sh

# Create certs directory and set permissions
RUN mkdir -p /usr/share/kibana/config/certs
RUN chown -R 1000:1000 /usr/share/kibana/config/certs


# Switch to the kibana user (ID 1000)
USER 1000

ENTRYPOINT ["/usr/local/bin/kibana-entrypoint.sh"]
