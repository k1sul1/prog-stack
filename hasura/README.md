# Hasura with Remix on Fly

Install Hasura CLI if you haven't already: https://hasura.io/docs/latest/graphql/core/hasura-cli/install-hasura-cli/

To run Hasura locally, just run `docker-compose up`. To access the Hasura console, run `hasura console` from the hasura directory.

Initial setup might include running this:

```
hasura metadata apply
hasura migrate apply
hasura metadata reload
hasura seed apply
```

## Linux support
This works "out-of-the-box" on Arch Linux, probably on every other distribution too. 

Only thing you have to change is docker-compose.yml.

You'll have to change 3 lines manually. Terrifying, I know. To make it easier for you, I've marked the lines with a comment.

Rest of this document is about getting it running on Fly and your Remix application talking to it.

## Setting it up

**Setup the Remix application before proceeding with this.** And don't use `hunter1` as your admin secret!

```
$ fly create remix-prog-stack-hasura
$ fly postgres create --name remix-prog-stack-hasura-db
$ fly postgres attach --postgres-app remix-prog-stack-hasura-db --app remix-prog-stack-hasura

$ fly secrets set HASURA_GRAPHQL_DATABASE_URL="[DATABASE_URL_FROM_ATTACH]" --app remix-prog-stack-hasura

$ fly secrets set HASURA_GRAPHQL_ADMIN_SECRET="hunter1" --app remix-prog-stack-hasura
$ fly secrets set HASURA_GRAPHQL_AUTH_HOOK="https://remix-prog-stack.fly.dev/hasura-auth" --app remix-prog-stack-hasura

# Before running this, go and change the memory limit to 512. Otherwise your deploy will fail.
# https://fly.io/apps/remix-prog-stack-hasura/scale
$ fly deploy
```

Then configure the application so it so it can talk to Hasura.

```

fly secrets set HASURA_URL="https://remix-prog-stack-hasura.fly.dev/v1/graphql" --app remix-prog-stack

# This should also work, but it didn't for me.
# fly secrets set HASURA_URL="http://remix-prog-stack-hasura.internal/v1/graphql" --app remix-prog-stack

fly secrets set HASURA_ADMIN_SECRET="hunter1" --app remix-prog-stack
```

> **Note:** If you do this from the hasura directory, you get a similar warning as shown earlier. It's probably fine to say yes.
> Alternatively, navigate to the application directory to set the secrets.

## Seeding the database

```
hasura seed apply --endpoint https://remix-prog-stack-hasura.fly.dev
```

To seed the local database, just leave the endpoint parameter out.

More info on
https://hasura.io/docs/latest/graphql/core/hasura-cli/hasura_seed/

## Migrations

As long as you do your edits through `hasura console`, migrations should sort themselves out on `fly deploy`, assuming the process doesn't run out of memory... If you don't need the extra juice and wish to save some money, edit the Dockerfile so it doesn't use a cli-migrations version of Hasura, and run the migrations manually.

To apply the migrations manually:

```
#!/bin/sh
# migrate.sh

echo "Applying migrations on https://remix-prog-stack-hasura.fly.dev"

hasura metadata apply --endpoint https://remix-prog-stack-hasura.fly.dev
hasura migrate apply --all-databases --endpoint https://remix-prog-stack-hasura.fly.dev
hasura metadata reload --endpoint https://remix-prog-stack-hasura.fly.dev
```

## VM Requirements

Hasura can work with the smallest available preset, shared cpu and 256MB of RAM. However, migrations will not.

If you see something like this in a failed deployment, increase the memory.

> 2022-06-18T21:55:12Z [info]{"timestamp":"2022-06-18T21:55:12.000+0000","level":"info","type":"startup","detail":{"kind":"migrations-apply","info":"applying metadata from /hasura-metadata"}}
>
> 2022-06-18T21:55:13Z [info][ 3.657854] \*\*Out of memory: Killed process 523 (graphql-engine) total-vm:1074264644kB, anon-rss:134036kB, file-rss:4kB, shmem-rss:0kB, UID:0 pgtables:404kB oom_score_adj:0
>
> 2022-06-18T21:55:13Z [info]{"level":"info","msg":"Help us improve Hasura! The cli collects anonymized usage stats which\nallow us to keep improving Hasura at warp speed. To opt-out or read more,\nvisit https://hasura.io/docs/latest/graphql/core/guides/telemetry.html\n","time":"2022-06-18T21:55:13Z"}
>
> 2022-06-18T21:55:13Z [info]{"level":"error","msg":"connecting to graphql-engine server failed","time":"2022-06-18T21:55:13Z"}

Don't be fooled by what's under it:

> 2022-06-18T21:55:13Z [info]{"level":"info","msg":"**possible reasons:**","time":"2022-06-18T21:55:13Z"}
>
> 2022-06-18T21:55:13Z [info]{"level":"info","msg":"1) Provided root endpoint of graphql-engine server is wrong. Verify endpoint key in config.yaml or/and value of --endpoint flag","time":"2022-06-18T21:55:13Z"}
>
> 2022-06-18T21:55:13Z [info]{"level":"info","msg":"3) Server might be unhealthy and is not running/accepting API requests","time":"2022-06-18T21:55:13Z"}
>
> t should be: https://hasura-cloud-app.io","time":"2022-06-18T21:55:13Z"}
> 2022-06-18T21:55:13Z [info]{"level":"info","msg":"3) **Server might be unhealthy and is not running/accepting API requests**","time":"2022-06-18T21:55:13Z"}
>
> 2022-06-18T21:55:13Z [info]{"level":"info","msg":"4) Admin secret is not correct/set","time":"2022-06-18T21:55:13Z"}
>
> 2> 022-06-18T21:55:13Z [info]{"level":"info","msg":"","time":"2022-06-18T21:55:13Z"}
> 2022-06-18T21:55:13Z [info]time="2022-06-18T21:55:13Z" level=fatal msg="making http request failed: Get \"http://localhost:9691/v1/version\": read tcp 127.0.0.1:45740->127.0.0.1:9691: read: connection reset by peer"
>
> 2022-06-18T21:55:13Z [info]Main child exited normally with code: 1
>
> 2022-06-18T21:55:13Z [info]Starting clean up.
>
> --> v19 failed - Failed due to unhealthy allocations - not rolling back to stable job version 19 as current job has same specification and deploying as v20
