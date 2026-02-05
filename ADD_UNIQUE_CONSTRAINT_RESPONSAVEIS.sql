-- Adiciona constraint UNIQUE no campo uid da tabela responsaveis
-- Isso permite usar upsert e evita duplicatas

-- 1. Remove duplicatas existentes (se houver)
DELETE FROM responsaveis
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM responsaveis
  GROUP BY uid
);

-- 2. Adiciona constraint UNIQUE no campo uid
ALTER TABLE responsaveis
ADD CONSTRAINT responsaveis_uid_unique UNIQUE (uid);

-- Verifica se foi criado
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'responsaveis'
AND constraint_type = 'UNIQUE';
