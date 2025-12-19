-- Update existing clubs to ACTIVE status if they are public and active
UPDATE clubs 
SET status = 'ACTIVE' 
WHERE "isActive" = true 
  AND "isPublic" = true 
  AND (status = 'PENDING' OR status IS NULL);
