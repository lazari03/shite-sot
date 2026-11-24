ALTER TABLE "Listing" ADD COLUMN "priceAssessment" JSONB;

UPDATE "ModerationPrompt"
SET "instructions" = replace("instructions", 'Return only the decision defined by the response schema. Never reject a listing or set a price.', 'Return approve for clear compliance. Return decline only for an obvious listing-policy violation supported by the input, and needs_human_review when uncertain. Never set a price.')
WHERE "key" = 'listing_review_v1'
  AND "instructions" LIKE '%Return only the decision defined by the response schema. Never reject a listing or set a price.%';
