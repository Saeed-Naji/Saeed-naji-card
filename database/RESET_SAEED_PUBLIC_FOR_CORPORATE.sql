-- OBSOLETE. NOT FOR EXECUTION.
-- This former all-in-one reset script was written before the new corp_* tables were created.
-- Running a complete reset now may destroy the active new corporate schema.
-- See database/STATUS_AND_FINISH_SAEED_RESET_AR.md for the accurate state.
-- After a verified backup, use database/FINAL_REMOVE_LEGACY_SAEED_REVIEW_FIRST.sql
-- in the Saeed Naji project afrvoshsiqartsketiuv, NOT any other Supabase project.
do $obsolete$
begin
  raise exception 'OBSOLETE SCRIPT: Do not execute. Use FINAL_REMOVE_LEGACY_SAEED_REVIEW_FIRST.sql only after full backup.';
end $obsolete$;
