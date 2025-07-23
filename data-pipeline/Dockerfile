FROM condaforge/miniforge3

# set working directory
RUN mkdir -p /home/pipeline
WORKDIR /home/pipeline
ENV HOME=/home/pipeline

# install os dependencies
RUN apt-get update && apt-get install -y sudo zip && rm -rf /var/lib/apt/lists/*

# install application dependencies
COPY environment.yaml ./
RUN conda env create --file environment.yaml --prefix ./env && \
    conda clean --all --yes
ENV CONDA_DEFAULT_ENV=/home/pipeline/env

# install tippecanoe (for generating vector tiles)
RUN apt-get update && sudo apt-get install -y gcc g++ make libsqlite3-dev zlib1g-dev && rm -rf /var/lib/apt/lists/*
RUN git clone --single-branch https://github.com/felt/tippecanoe.git && cd tippecanoe && make -j && make install
RUN cp tippecanoe/tippecanoe /usr/local/bin/tippecanoe
RUN cp tippecanoe/tippecanoe-decode /usr/local/bin/tippecanoe-decode
RUN cp tippecanoe/tippecanoe-enumerate /usr/local/bin/tippecanoe-enumerate
RUN cp tippecanoe/tippecanoe-json-tool /usr/local/bin/tippecanoe-json-tool
RUN cp tippecanoe/tippecanoe-overzoom /usr/local/bin/tippecanoe-overzoom
RUN cp tippecanoe/unit /usr/local/bin/unit
RUN cp tippecanoe/tile-join /usr/local/bin/tile-join
RUN rm -rf tippecanoe

# allow mounting volumes
RUN mkdir -p /data && ln -s /data /home/pipeline/data
RUN mkdir -p /input && ln -s /input /home/pipeline/input
RUN mkdir -p /credentials && ln -s /credentials /home/pipeline/credentials
VOLUME /data
VOLUME /input
VOLUME /credentials

# add entrypoint script
COPY docker-image-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# allow the default user to use sudo on chmod without a password
RUN usermod -aG sudo ubuntu
RUN echo "ubuntu ALL=(ALL) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd, /bin/chmod" > /etc/sudoers.d/ubuntu && \
    chmod 0440 /etc/sudoers.d/ubuntu

# copy in the source code
COPY src ./src/

# start the application when the container starts
ENTRYPOINT ["/entrypoint.sh"]
