FROM docker.elastic.co/kibana/kibana:8.11.0

USER root
COPY Kibana/kibana-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/kibana-entrypoint.sh

# Copy SSL certificates
COPY certs/ca-cert.pem /usr/share/kibana/config/certs/
COPY certs/kibana-cert.pem /usr/share/kibana/config/certs/
COPY certs/kibana-key.pem /usr/share/kibana/config/certs/

# Create certs directory and set permissions
RUN mkdir -p /usr/share/kibana/config/certs
RUN chown -R 1000:1000 /usr/share/kibana/config/certs
RUN chmod 644 /usr/share/kibana/config/certs/*.pem
RUN chmod 600 /usr/share/kibana/config/certs/kibana-key.pem

# Switch to the kibana user (ID 1000)
USER 1000

ENTRYPOINT ["/usr/local/bin/kibana-entrypoint.sh"]
