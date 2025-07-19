FROM docker.elastic.co/kibana/kibana:8.11.0

USER root
COPY kibana-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/kibana-entrypoint.sh

# Switch to the kibana user (ID 1000)
USER 1000

ENTRYPOINT ["/usr/local/bin/kibana-entrypoint.sh"]
