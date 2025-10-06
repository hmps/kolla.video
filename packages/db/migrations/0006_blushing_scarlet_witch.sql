-- First, fix any duplicate indexes by reassigning sequential indexes within each event
UPDATE clips
SET `index` = (
  SELECT COUNT(*)
  FROM clips AS c2
  WHERE c2.event_id = clips.event_id
  AND c2.id <= clips.id
);

-- Now create the unique constraint
CREATE UNIQUE INDEX `clips_event_id_index_unique` ON `clips` (`event_id`,`index`);