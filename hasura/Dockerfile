FROM hasura/graphql-engine:latest.cli-migrations-v3

COPY ./migrations/ /hasura-migrations
COPY ./metadata/ /hasura-metadata
COPY ./entrypoint.sh .

ENV HASURA_GRAPHQL_ENABLE_CONSOLE="false"
ENV HASURA_GRAPHQL_ENABLED_LOG_TYPES="startup,query-log"
ENV HASURA_GRAPHQL_MIGRATIONS_SERVER_TIMEOUT=60
ENV HASURA_GRAPHQL_SERVER_PORT=8080
ENV HASURA_ADMIN_SECRET='hunter1'

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD ["graphql-engine", "serve"]
