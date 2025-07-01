FROM debian:bookworm

# install necessary tools
RUN	apt-get update && \
	apt-get install -y wget && \
	apt-get install -y curl && \
	apt-get install -y default-jdk && \
	apt-get install -y gnupg && \
	apt-get install -y unzip && \
	apt-get install -y procps && \
	rm -rf /var/lib/apt/lists/*

# Download and decompress Elasticsearch
RUN wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.18.2-linux-aarch64.tar.gz && \
    tar -xzf elasticsearch-8.18.2-linux-aarch64.tar.gz

RUN mv elasticsearch-8.18.2 /usr/share/elasticsearch && \
    rm elasticsearch-8.18.2-linux-aarch64.tar.gz

# Copy .yml file
COPY elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml

# Give access to a specific user (elasticsearch refuses to be root)
RUN useradd -m elasticsearch && \
    chown -R elasticsearch:elasticsearch /usr/share/elasticsearch

USER elasticsearch

WORKDIR /usr/share/elasticsearch

# Expose port HTTP (9200) and transport (9300)
EXPOSE 9200 9300

# start cmd
CMD ["./bin/elasticsearch"]
