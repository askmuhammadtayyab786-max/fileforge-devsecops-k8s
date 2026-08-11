FROM mongo:7@sha256:35a5926f71f8b6cb19206bee928c5a85f241a8be99f20c81abe35ae78a73415d

RUN rm -rf /usr/bin/mongoexport /usr/bin/mongoimport \
    /usr/bin/mongodump /usr/bin/mongorestore \
    /usr/bin/mongofiles /usr/bin/mongostat /usr/bin/mongotop \
    /usr/bin/bsondump

RUN rm -rf /opt/js-yaml

# Replace gosu (stuck on old Go stdlib, no newer release) with su-exec —
# same root->non-root privilege drop, single-purpose C binary, no Go
# runtime dependency, so no inherited Go stdlib CVEs.
RUN set -eux; \
    apt-get update && apt-get install -y --no-install-recommends git build-essential ca-certificates; \
    git clone https://github.com/ncopa/su-exec.git /tmp/su-exec && \
    cd /tmp/su-exec && make && \
    mv su-exec /usr/local/bin/gosu && \
    apt-get purge -y --auto-remove git build-essential ca-certificates && \
    rm -rf /tmp/su-exec /var/lib/apt/lists/*
