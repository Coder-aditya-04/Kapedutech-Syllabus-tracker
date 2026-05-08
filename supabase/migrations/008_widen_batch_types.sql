-- Widen batch_type CHECK constraint to include SSC and CBSE types
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_batch_type_check;

ALTER TABLE batches
  ADD CONSTRAINT batches_batch_type_check CHECK (
    batch_type IN (
      'NEET_EXCEL', 'NEET_GROWTH',
      'JEE_EXCEL',  'JEE_GROWTH',
      'MHT_CET',
      'SSC_8TH',  'SSC_9TH',  'SSC_10TH',
      'CBSE_8TH', 'CBSE_9TH', 'CBSE_10TH'
    )
  );
