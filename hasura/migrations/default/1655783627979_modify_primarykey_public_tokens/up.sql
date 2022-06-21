BEGIN TRANSACTION;
ALTER TABLE "public"."tokens" DROP CONSTRAINT "tokens_pkey";

ALTER TABLE "public"."tokens"
    ADD CONSTRAINT "tokens_pkey" PRIMARY KEY ("token");
COMMIT TRANSACTION;
