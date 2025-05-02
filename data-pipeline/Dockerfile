FROM condaforge/miniforge3

# set working directory
RUN mkdir -p /home/pipeline
WORKDIR /home/pipeline
ENV HOME=/home/pipeline

# install os dependencies
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# install application dependencies
COPY environment.yaml ./
RUN conda env create --file environment.yaml --prefix ./env && \
    conda clean --all --yes
ENV CONDA_DEFAULT_ENV=/home/pipeline/env

# allow mounting volumes
RUN mkdir -p /data && ln -s /data /home/pipeline/data
RUN mkdir -p /input && ln -s /input /home/pipeline/input
VOLUME /data
VOLUME /input

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
