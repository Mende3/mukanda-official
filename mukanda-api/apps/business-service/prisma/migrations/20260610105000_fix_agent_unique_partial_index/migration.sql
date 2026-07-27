-- Remove o unique constraint existente
DROP INDEX IF EXISTS "Agent_businessId_type_key";

-- Cria o partial index: unique só para tipos não-CUSTOM
CREATE UNIQUE INDEX "Agent_businessId_type_unique_standard"
ON "Agent" ("businessId", "type")
WHERE "type" != 'CUSTOM';