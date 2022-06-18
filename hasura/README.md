# Hasura on Fly

``
$ fly create remix-prog-hasura
$ fly postgres create --name remix-prog-hasura-db
$ fly postgres attach --postgres-app remix-prog-hasura-db --app remix-prog-hasura

$ fly secrets set HASURA_GRAPHQL_DATABASE_URL="[DATABASE_URL_FROM_ATTACH]" --app remix-prog-hasura

$ fly secrets set HASURA_GRAPHQL_ADMIN_SECRET="OurAdminSecret" --app remix-prog-hasura

```

```
