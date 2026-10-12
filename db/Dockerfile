FROM mysql:8.4
# Dedicated log directory (mounted as its own volume, separate from the backend logs)
RUN mkdir -p /var/log/mysql && chown mysql:mysql /var/log/mysql
COPY logging.cnf /etc/mysql/conf.d/logging.cnf
