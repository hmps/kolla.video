-- Add index column with default value first
ALTER TABLE `clips` ADD `index` integer NOT NULL DEFAULT 0;

-- Update existing clips to have sequential indexes within each event
UPDATE `clips`
SET `index` = (
  SELECT COUNT(*)
  FROM `clips` AS c2
  WHERE c2.event_id = clips.event_id
  AND c2.id <= clips.id
);