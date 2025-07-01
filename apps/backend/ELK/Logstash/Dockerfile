FROM debian:bookworm

# install necessary tools
RUN	apt-get update && \
	apt-get install -y wget && \
	apt-get install -y curl && \
	apt-get install -y gnupg && \
	apt-get install -y unzip && \
	apt-get install -y procps && \
	rm -rf /var/lib/apt/lists/*

# Download and decompress logstash
RUN wget https://artifacts.elastic.co/downloads/logstash/logstash-8.18.2-linux-aarch64.tar.gz && \
    tar -xzf logstash-8.18.2-linux-aarch64.tar.gz

RUN mv logstash-8.18.2 /usr/share/logstash && \
    rm logstash-8.18.2-linux-aarch64.tar.gz
