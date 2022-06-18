FROM hasura/graphql-engine:latest.cli-migrations-v3

COPY ./migrations/ /hasura-migrations
COPY ./metadata/ /hasura-metadata
COPY ./entrypoint.sh .

ENV HASURA_GRAPHQL_ENABLE_CONSOLE="false"
ENV HASURA_GRAPHQL_ENABLED_LOG_TYPES="startup,query-log"
ENV HASURA_GRAPHQL_MIGRATIONS_SERVER_TIMEOUT=60
ENV HASURA_GRAPHQL_SERVER_PORT=8080

# Injected via DATABASE_URL by Fly, assuming you attached the database
# ENV HASURA_GRAPHQL_DATABASE_URL=$DATABASE_URL

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD /bin/env
