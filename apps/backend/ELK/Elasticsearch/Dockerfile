FROM debian:bookworm

# install necessary tools
RUN	apt-get update && \
	apt-get install -y openjdk-17-jdk && \
	apt-get install -y wget && \
	apt-get install -y curl && \
	apt-get install -y gnupg && \
	apt-get install -y unzip && \
	apt-get install -y procps && \
	rm -rf /var/lib/apt/lists/*

# set up JAVA env
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Download and decompress Elasticsearch
RUN wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-9.0.3-linux-x86_64.tar.gz && \
	tar -xzf elasticsearch-9.0.3-linux-x86_64.tar.gz

RUN mv elasticsearch-9.0.3 /usr/share/elasticsearch && \
	rm elasticsearch-9.0.3-linux-x86_64.tar.gz

# Copier le fichier de config par défaut (optionnel)
COPY elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml

# Donner les droits (pour que le processus puisse écrire dans les dossiers)
#RUN useradd -m elasticsearch && \
#   chown -R elasticsearch:elasticsearch /usr/share/elasticsearch

#USER elasticsearch

WORKDIR /usr/share/elasticsearch

# Exposer le port HTTP (9200) et transport (9300)
EXPOSE 9200 9300

# Commande de démarrage
CMD ["./bin/elasticsearch"]
