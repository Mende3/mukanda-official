FROM redis/redis-stack-server:latest
 
RUN apt-get update && apt-get install -y gettext-base && rm -rf /var/lib/apt/lists/*
 
COPY conf/redis.conf /etc/redis/redis.conf.template
COPY script/entrypoint.sh /entrypoint.sh
 
RUN chmod +x /entrypoint.sh
 
EXPOSE 6380
 
ENTRYPOINT ["/entrypoint.sh"]
 