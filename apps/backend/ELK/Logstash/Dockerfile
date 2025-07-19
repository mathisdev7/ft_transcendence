FROM docker.elastic.co/logstash/logstash:8.11.0

USER root
COPY Logstash/logstash-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/logstash-entrypoint.sh

# Copy SSL certificates
COPY certs/ca-cert.pem /usr/share/logstash/config/certs/
COPY certs/logstash-cert.pem /usr/share/logstash/config/certs/
COPY certs/logstash-key.pem /usr/share/logstash/config/certs/

# Create certs directory and set permissions
RUN mkdir -p /usr/share/logstash/config/certs
RUN chown -R 1000:1000 /usr/share/logstash/config/certs
RUN chmod 644 /usr/share/logstash/config/certs/*.pem
RUN chmod 600 /usr/share/logstash/config/certs/logstash-key.pem

# Switch to the logstash user (ID 1000)
USER 1000

ENTRYPOINT ["/usr/local/bin/logstash-entrypoint.sh"]
