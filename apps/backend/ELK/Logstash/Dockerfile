FROM docker.elastic.co/logstash/logstash:8.11.0

USER root
COPY logstash-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/logstash-entrypoint.sh

# Switch to the logstash user (ID 1000)
USER 1000

ENTRYPOINT ["/usr/local/bin/logstash-entrypoint.sh"]
