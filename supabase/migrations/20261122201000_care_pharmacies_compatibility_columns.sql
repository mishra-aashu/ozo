-- Migration: Ensure compatibility columns and flexible constraints for care_pharmacies onboarding
-- Description: Adds address, operating_hours, drug_license_number columns and relaxes constraints for seamless partner registration

ALTER TABLE care_pharmacies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE care_pharmacies ADD COLUMN IF NOT EXISTS operating_hours text;
ALTER TABLE care_pharmacies ADD COLUMN IF NOT EXISTS drug_license_number text;

-- Relax specific NOT NULL constraints if not provided during simplified onboarding
ALTER TABLE care_pharmacies ALTER COLUMN owner_name DROP NOT NULL;
ALTER TABLE care_pharmacies ALTER COLUMN drug_license_form_20 DROP NOT NULL;
ALTER TABLE care_pharmacies ALTER COLUMN drug_license_form_21 DROP NOT NULL;
ALTER TABLE care_pharmacies ALTER COLUMN pharmacist_reg_number DROP NOT NULL;
ALTER TABLE care_pharmacies ALTER COLUMN store_address DROP NOT NULL;

-- Automatically sync address <-> store_address and drug_license_number <-> drug_license_form_20
CREATE OR REPLACE FUNCTION sync_care_pharmacies_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_address IS NULL AND NEW.address IS NOT NULL THEN
    NEW.store_address := NEW.address;
  ELSIF NEW.address IS NULL AND NEW.store_address IS NOT NULL THEN
    NEW.address := NEW.store_address;
  END IF;

  IF NEW.drug_license_form_20 IS NULL AND NEW.drug_license_number IS NOT NULL THEN
    NEW.drug_license_form_20 := NEW.drug_license_number;
  END IF;

  IF NEW.owner_name IS NULL THEN
    NEW.owner_name := COALESCE(NEW.registered_pharmacist_name, 'Store Owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_care_pharmacies_fields ON care_pharmacies;
CREATE TRIGGER trg_sync_care_pharmacies_fields
BEFORE INSERT OR UPDATE ON care_pharmacies
FOR EACH ROW EXECUTE FUNCTION sync_care_pharmacies_fields();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
