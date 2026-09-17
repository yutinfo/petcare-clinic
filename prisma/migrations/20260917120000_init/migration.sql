-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PDPA_GENERAL', 'MARKETING', 'PHOTO_SHARING', 'MEDICAL_DISCLOSURE');

-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('ACTIVE', 'DECEASED', 'TRANSFERRED_OUT', 'LOST');

-- CreateEnum
CREATE TYPE "PetAlertType" AS ENUM ('ALLERGY', 'CHRONIC_CONDITION', 'BEHAVIOUR', 'DRUG_REACTION', 'DIET', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('VET', 'VET_TECH', 'GROOMER', 'EXAM_ROOM', 'GROOMING_STATION', 'KENNEL', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "KennelSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE', 'CAT_CONDO', 'ISOLATION', 'ICU');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('CONSULT', 'VACCINE', 'FOLLOW_UP', 'SURGERY', 'GROOMING', 'BOARDING', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('STAFF', 'PORTAL', 'PHONE', 'WALK_IN', 'LINE');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('OPD', 'IPD', 'EMERGENCY', 'VACCINE', 'SURGERY', 'RECHECK');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'PENDING_RESULT', 'READY_TO_BILL', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CHRONIC', 'RULED_OUT');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('LAB', 'IMAGING', 'PROCEDURE', 'NURSING', 'DIET', 'REFERRAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentFormType" AS ENUM ('SURGERY', 'ANESTHESIA', 'EUTHANASIA', 'HOSPITALIZATION', 'BOARDING', 'TREATMENT_REFUSAL');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PARTIALLY_DISPENSED', 'DISPENSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedAdminStatus" AS ENUM ('SCHEDULED', 'GIVEN', 'REFUSED', 'MISSED', 'HELD');

-- CreateEnum
CREATE TYPE "StayType" AS ENUM ('BOARDING', 'HOSPITAL', 'DAYCARE');

-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CareLogType" AS ENUM ('FEED', 'WATER', 'WALK', 'PLAY', 'MEDICATE', 'CLEAN', 'GROOM', 'OBSERVATION', 'INCIDENT');

-- CreateEnum
CREATE TYPE "GroomingStatus" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'DRYING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULT', 'PROCEDURE', 'SURGERY', 'LAB', 'IMAGING', 'VACCINE', 'GROOMING', 'BOARDING', 'NURSING', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxCode" AS ENUM ('VAT7', 'VAT0', 'EXEMPT', 'NONVAT');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('DRUG', 'VACCINE', 'CONSUMABLE', 'FOOD', 'RETAIL', 'SUPPLEMENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'DISPENSE', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'WASTE', 'COUNT_ADJUST', 'INTERNAL_USE');

-- CreateEnum
CREATE TYPE "ChargeSourceType" AS ENUM ('ENCOUNTER', 'STAY', 'GROOMING', 'POS', 'BOOKING_DEPOSIT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChargeItemType" AS ENUM ('SERVICE', 'PRODUCT', 'PACKAGE', 'DEPOSIT', 'FEE', 'DISCOUNT_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('OPEN', 'INVOICED', 'VOID');

-- CreateEnum
CREATE TYPE "InvoiceDocType" AS ENUM ('FULL_TAX_INVOICE', 'ABBREVIATED_TAX_INVOICE', 'RECEIPT', 'PROFORMA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PROMPTPAY', 'BANK_TRANSFER', 'STORE_CREDIT', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_USED', 'USED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'LINE', 'PUSH', 'IN_APP');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "tax_id" TEXT,
    "logo_key" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "locale" TEXT NOT NULL DEFAULT 'th',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_line" TEXT,
    "sub_district" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "is_head_office" BOOLEAN NOT NULL DEFAULT false,
    "tax_branch_code" TEXT NOT NULL DEFAULT '00000',
    "open_time_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_key" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "mfa_secret" TEXT,
    "mfa_enabled_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "is_platform_root" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "employee_code" TEXT,
    "job_title" TEXT,
    "license_no" TEXT,
    "signature_key" TEXT,
    "default_branch_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipBranch" (
    "membership_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,

    CONSTRAINT "MembershipBranch_pkey" PRIMARY KEY ("membership_id","branch_id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "role_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "branch_id" UUID,
    "actor_user_id" UUID,
    "actor_member_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_satang" INTEGER NOT NULL,
    "max_branches" INTEGER NOT NULL,
    "max_staff" INTEGER NOT NULL,
    "features" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "seats" INTEGER NOT NULL DEFAULT 5,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_ends_at" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "cancel_at" TIMESTAMPTZ,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "prefix" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "nickname" TEXT,
    "search_key" TEXT NOT NULL,
    "email" TEXT,
    "line_user_id" TEXT,
    "address_line" TEXT,
    "sub_district" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "tax_id" TEXT,
    "tax_branch_code" TEXT,
    "id_card_no_enc" TEXT,
    "note" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "block_reason" TEXT,
    "credit_limit_satang" INTEGER NOT NULL DEFAULT 0,
    "referral_source" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerPhone" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'มือถือ',
    "raw" TEXT NOT NULL,
    "digits" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OwnerPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerConsent" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "channel" TEXT NOT NULL,
    "evidence_key" TEXT,

    CONSTRAINT "OwnerConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breed" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "species_id" UUID NOT NULL,
    "name_th" TEXT NOT NULL,
    "name_en" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Breed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "search_key" TEXT NOT NULL,
    "species_id" UUID NOT NULL,
    "breed_id" UUID,
    "sex" "PetSex" NOT NULL DEFAULT 'UNKNOWN',
    "is_neutered" BOOLEAN NOT NULL DEFAULT false,
    "neutered_at" DATE,
    "birth_date" DATE,
    "birth_date_is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "color_markings" TEXT,
    "microchip_no" TEXT,
    "microchip_at" DATE,
    "blood_type" TEXT,
    "photo_key" TEXT,
    "insurance_provider" TEXT,
    "insurance_policy_no" TEXT,
    "current_weight_kg" DECIMAL(8,3),
    "current_weight_at" TIMESTAMPTZ,
    "status" "PetStatus" NOT NULL DEFAULT 'ACTIVE',
    "deceased_at" DATE,
    "deceased_cause" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetWeight" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "encounter_id" UUID,
    "measured_at" TIMESTAMPTZ NOT NULL,
    "weight_kg" DECIMAL(8,3) NOT NULL,
    "body_condition_score" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'CLINIC_SCALE',
    "recorded_by_id" UUID,

    CONSTRAINT "PetWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetAlert" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "type" "PetAlertType" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "active_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_to" TIMESTAMPTZ,
    "created_by_id" UUID,

    CONSTRAINT "PetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetOwnerHistory" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "from_owner_id" UUID,
    "to_owner_id" UUID NOT NULL,
    "transferred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "recorded_by_id" UUID,

    CONSTRAINT "PetOwnerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "encounter_id" UUID,
    "product_id" UUID,
    "vaccine_name" TEXT NOT NULL,
    "vaccine_type" TEXT,
    "lot_no" TEXT,
    "expiry_date" DATE,
    "administered_at" TIMESTAMPTZ NOT NULL,
    "administered_by_id" UUID,
    "injection_site" TEXT,
    "next_due_at" DATE,
    "certificate_no" TEXT,
    "certificate_key" TEXT,
    "note" TEXT,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "type" "ResourceType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "membership_id" UUID,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "color_hex" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KennelProfile" (
    "resource_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "size" "KennelSize" NOT NULL,
    "zone" TEXT,
    "allowed_species_codes" TEXT[],
    "allow_sharing" BOOLEAN NOT NULL DEFAULT false,
    "max_occupancy" INTEGER NOT NULL DEFAULT 1,
    "daily_rate_service_id" UUID,
    "features" TEXT[],
    "is_out_of_service" BOOLEAN NOT NULL DEFAULT false,
    "out_of_service_reason" TEXT,

    CONSTRAINT "KennelProfile_pkey" PRIMARY KEY ("resource_id")
);

-- CreateTable
CREATE TABLE "ResourceShift" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_minutes" INTEGER NOT NULL DEFAULT 30,
    "effective_from" DATE,
    "effective_to" DATE,

    CONSTRAINT "ResourceShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceTimeOff" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ResourceTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "BookingSource" NOT NULL DEFAULT 'STAFF',
    "owner_id" UUID NOT NULL,
    "pet_id" UUID,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "expected_nights" INTEGER,
    "requested_note" TEXT,
    "internal_note" TEXT,
    "deposit_required_satang" INTEGER NOT NULL DEFAULT 0,
    "deposit_paid_satang" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "confirmed_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by_id" UUID,
    "cancel_reason" TEXT,
    "reminded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "service_item_id" UUID NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingResource" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "BookingResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pet_id" UUID,
    "type" "BookingType" NOT NULL,
    "preferred_from" TIMESTAMPTZ NOT NULL,
    "preferred_to" TIMESTAMPTZ NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "type" "EncounterType" NOT NULL DEFAULT 'OPD',
    "status" "EncounterStatus" NOT NULL DEFAULT 'WAITING',
    "pet_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "booking_id" UUID,
    "arrived_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "primary_vet_id" UUID,
    "room_resource_id" UUID,
    "chief_complaint" TEXT,
    "triage_level" INTEGER,
    "follow_up_at" DATE,
    "discharge_note" TEXT,
    "created_by_id" UUID,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalSign" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature_c" DECIMAL(4,1),
    "heart_rate_bpm" INTEGER,
    "resp_rate_bpm" INTEGER,
    "weight_kg" DECIMAL(8,3),
    "bcs" INTEGER,
    "pain_score" INTEGER,
    "mucous_membrane" TEXT,
    "crt_seconds" DECIMAL(3,1),
    "systolic_bp" INTEGER,
    "spo2" INTEGER,
    "note" TEXT,
    "recorded_by_id" UUID,

    CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoapNote" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "author_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "signed_at" TIMESTAMPTZ,
    "signed_by_id" UUID,

    CONSTRAINT "SoapNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoapAddendum" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "soap_note_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoapAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisCode" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "system" TEXT NOT NULL DEFAULT 'VENOM',
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "name_en" TEXT,
    "body_system" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiagnosisCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "encounter_id" UUID,
    "diagnosis_code_id" UUID,
    "label" TEXT NOT NULL,
    "status" "ProblemStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "onset_date" DATE,
    "resolved_at" DATE,
    "note" TEXT,
    "recorded_by_id" UUID,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalOrder" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "type" "OrderType" NOT NULL,
    "service_item_id" UUID,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" "OrderStatus" NOT NULL DEFAULT 'ORDERED',
    "ordered_by_id" UUID NOT NULL,
    "ordered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by_id" UUID,
    "performed_at" TIMESTAMPTZ,
    "result_summary" TEXT,
    "cancel_reason" TEXT,

    CONSTRAINT "ClinicalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "panel_name" TEXT NOT NULL,
    "analyte" TEXT NOT NULL,
    "value_text" TEXT,
    "value_num" DECIMAL(14,4),
    "unit" TEXT,
    "ref_low" DECIMAL(14,4),
    "ref_high" DECIMAL(14,4),
    "flag" TEXT,
    "resulted_at" TIMESTAMPTZ NOT NULL,
    "device_name" TEXT,
    "entered_by_id" UUID,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "encounter_id" UUID,
    "order_id" UUID,
    "uploaded_by_id" UUID,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visible_to_owner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentForm" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "encounter_id" UUID,
    "type" "ConsentFormType" NOT NULL,
    "content_version" TEXT NOT NULL,
    "body_snapshot" TEXT NOT NULL,
    "signed_at" TIMESTAMPTZ NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_relation" TEXT NOT NULL DEFAULT 'OWNER',
    "signature_key" TEXT NOT NULL,
    "witness_id" UUID,

    CONSTRAINT "ConsentForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentEstimate" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "low_satang" INTEGER NOT NULL,
    "high_satang" INTEGER NOT NULL,
    "lines_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "presented_at" TIMESTAMPTZ,
    "approved_at" TIMESTAMPTZ,
    "approver_name" TEXT,
    "signature_key" TEXT,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "TreatmentEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "encounter_id" UUID,
    "pet_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "dose_amount" DECIMAL(12,4) NOT NULL,
    "dose_unit" TEXT NOT NULL,
    "weight_kg_at_order" DECIMAL(8,3),
    "mg_per_kg" DECIMAL(10,4),
    "route" TEXT NOT NULL,
    "frequency_code" TEXT NOT NULL,
    "times_per_day" DECIMAL(5,2) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "total_qty_base" DECIMAL(12,4) NOT NULL,
    "refills_allowed" INTEGER NOT NULL DEFAULT 0,
    "instruction_th" TEXT NOT NULL,
    "warning_th" TEXT,
    "with_food" BOOLEAN,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "prescriber_id" UUID NOT NULL,
    "prescribed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancel_reason" TEXT,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispense" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "prescription_id" UUID,
    "product_id" UUID NOT NULL,
    "qty_base" DECIMAL(12,4) NOT NULL,
    "dispensed_by_id" UUID NOT NULL,
    "dispensed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label_printed_at" TIMESTAMPTZ,
    "note" TEXT,

    CONSTRAINT "Dispense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedAdmin" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "stay_id" UUID,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "administered_at" TIMESTAMPTZ,
    "administered_by_id" UUID,
    "status" "MedAdminStatus" NOT NULL DEFAULT 'SCHEDULED',
    "actual_dose" DECIMAL(12,4),
    "route" TEXT,
    "site" TEXT,
    "reaction" TEXT,
    "note" TEXT,

    CONSTRAINT "MedAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stay" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "StayType" NOT NULL,
    "status" "StayStatus" NOT NULL DEFAULT 'RESERVED',
    "pet_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "booking_id" UUID,
    "encounter_id" UUID,
    "kennel_resource_id" UUID NOT NULL,
    "check_in_at" TIMESTAMPTZ,
    "expected_out_at" TIMESTAMPTZ NOT NULL,
    "check_out_at" TIMESTAMPTZ,
    "billed_through_date" DATE,
    "daily_rate_service_id" UUID,
    "daily_rate_satang" INTEGER,
    "feeding_plan" TEXT,
    "medication_plan" TEXT,
    "belongings" JSONB,
    "special_instruction" TEXT,
    "emergency_contact" TEXT,
    "vaccine_verified_at" TIMESTAMPTZ,
    "vaccine_verified_by_id" UUID,
    "check_in_by_id" UUID,
    "check_out_by_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayKennelMove" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "stay_id" UUID NOT NULL,
    "from_resource_id" UUID NOT NULL,
    "to_resource_id" UUID NOT NULL,
    "moved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "moved_by_id" UUID,

    CONSTRAINT "StayKennelMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareLog" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "stay_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "CareLogType" NOT NULL,
    "detail" TEXT,
    "appetite_score" INTEGER,
    "stool_score" INTEGER,
    "urination" TEXT,
    "mood_note" TEXT,
    "photo_keys" TEXT[],
    "staff_id" UUID NOT NULL,
    "shared_to_owner_at" TIMESTAMPTZ,

    CONSTRAINT "CareLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroomingJob" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "GroomingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "booking_id" UUID,
    "pet_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "groomer_resource_id" UUID NOT NULL,
    "station_resource_id" UUID,
    "check_in_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "picked_up_at" TIMESTAMPTZ,
    "style_note" TEXT,
    "clipper_blade_size" TEXT,
    "coat_condition" TEXT,
    "skin_findings" TEXT,
    "found_parasites" BOOLEAN NOT NULL DEFAULT false,
    "before_photo_keys" TEXT[],
    "after_photo_keys" TEXT[],
    "incident_note" TEXT,
    "next_due_weeks" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroomingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroomingPreference" (
    "pet_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "preferred_style" TEXT,
    "blade_size" TEXT,
    "shampoo_product_id" UUID,
    "avoid_note" TEXT,
    "temperament_note" TEXT,
    "needs_muzzle" BOOLEAN NOT NULL DEFAULT false,
    "preferred_groomer_resource_id" UUID,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GroomingPreference_pkey" PRIMARY KEY ("pet_id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "description" TEXT,
    "price_satang" INTEGER NOT NULL,
    "tax_code" "TaxCode" NOT NULL DEFAULT 'VAT7',
    "duration_minutes" INTEGER,
    "required_resource_type" "ResourceType",
    "is_bookable_online" BOOLEAN NOT NULL DEFAULT false,
    "online_deposit_satang" INTEGER NOT NULL DEFAULT 0,
    "species_codes" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_satang" INTEGER NOT NULL,
    "valid_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackageLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "service_item_id" UUID,
    "product_id" UUID,
    "qty" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ServicePackageLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "generic_name" TEXT,
    "search_key" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "category" TEXT,
    "dosage_form" TEXT,
    "strength" TEXT,
    "base_unit" TEXT NOT NULL,
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "controlled_class" TEXT,
    "requires_prescription" BOOLEAN NOT NULL DEFAULT false,
    "default_price_satang" INTEGER NOT NULL,
    "cost_satang" INTEGER,
    "tax_code" "TaxCode" NOT NULL DEFAULT 'VAT7',
    "reorder_point_base" DECIMAL(14,4),
    "max_stock_base" DECIMAL(14,4),
    "storage_note" TEXT,
    "manufacturer" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_name" TEXT NOT NULL,
    "factor_to_base" DECIMAL(14,4) NOT NULL,
    "is_purchase_unit" BOOLEAN NOT NULL DEFAULT false,
    "is_sale_unit" BOOLEAN NOT NULL DEFAULT true,
    "price_satang" INTEGER,
    "barcode" TEXT,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "payment_terms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "ordered_at" TIMESTAMPTZ,
    "expected_at" DATE,
    "subtotal_satang" INTEGER NOT NULL DEFAULT 0,
    "vat_satang" INTEGER NOT NULL DEFAULT 0,
    "total_satang" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_name" TEXT NOT NULL,
    "factor_to_base" DECIMAL(14,4) NOT NULL,
    "qty_ordered" DECIMAL(14,4) NOT NULL,
    "qty_received_base" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "unit_cost_satang" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "purchase_order_id" UUID,
    "supplier_id" UUID NOT NULL,
    "supplier_invoice_no" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_id" UUID NOT NULL,
    "note" TEXT,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "goods_receipt_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_name" TEXT NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "qty_base" DECIMAL(14,4) NOT NULL,
    "lot_no" TEXT NOT NULL,
    "expiry_date" DATE,
    "unit_cost_satang" INTEGER NOT NULL,
    "lot_id" UUID,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "lot_no" TEXT NOT NULL,
    "expiry_date" DATE,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unit_cost_satang" INTEGER NOT NULL,
    "supplier_id" UUID,
    "is_quarantined" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "lot_id" UUID,
    "type" "StockMovementType" NOT NULL,
    "qty_base" DECIMAL(14,4) NOT NULL,
    "unit_cost_satang" INTEGER,
    "ref_type" TEXT,
    "ref_id" UUID,
    "dispense_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by_id" UUID NOT NULL,
    "reason" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOnHand" (
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "qty_base" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StockOnHand_pkey" PRIMARY KEY ("tenant_id","branch_id","product_id","lot_id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "from_branch_id" UUID NOT NULL,
    "to_branch_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMPTZ,
    "sent_by_id" UUID,
    "received_at" TIMESTAMPTZ,
    "received_by_id" UUID,
    "note" TEXT,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "lot_id" UUID,
    "qty_base" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "StockTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "scope_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "posted_at" TIMESTAMPTZ,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "stock_count_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "lot_id" UUID,
    "system_qty_base" DECIMAL(14,4) NOT NULL,
    "counted_qty_base" DECIMAL(14,4),
    "variance_qty_base" DECIMAL(14,4),
    "counted_by_id" UUID,
    "note" TEXT,

    CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledDrugEntry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_id" UUID NOT NULL,
    "qty_base" DECIMAL(14,4) NOT NULL,
    "balance_after_base" DECIMAL(14,4) NOT NULL,
    "pet_id" UUID,
    "prescriber_id" UUID,
    "performed_by_id" UUID NOT NULL,
    "witness_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ControlledDrugEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeItem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pet_id" UUID,
    "source_type" "ChargeSourceType" NOT NULL,
    "encounter_id" UUID,
    "stay_id" UUID,
    "grooming_job_id" UUID,
    "pos_sale_id" UUID,
    "booking_id" UUID,
    "item_type" "ChargeItemType" NOT NULL,
    "service_item_id" UUID,
    "product_id" UUID,
    "product_unit_id" UUID,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "unit_name" TEXT,
    "unit_price_satang" INTEGER NOT NULL,
    "discount_satang" INTEGER NOT NULL DEFAULT 0,
    "discount_reason" TEXT,
    "discount_approved_by_id" UUID,
    "tax_code" "TaxCode" NOT NULL DEFAULT 'VAT7',
    "vat_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "amount_satang" INTEGER NOT NULL,
    "performed_by_id" UUID,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ChargeStatus" NOT NULL DEFAULT 'OPEN',
    "invoice_id" UUID,
    "created_by_id" UUID,
    "voided_at" TIMESTAMPTZ,
    "voided_by_id" UUID,
    "void_reason" TEXT,

    CONSTRAINT "ChargeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSale" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "owner_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "cashier_id" UUID NOT NULL,
    "shift_id" UUID,
    "note" TEXT,

    CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "doc_type" "InvoiceDocType" NOT NULL,
    "number" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "pos_sale_id" UUID,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issued_at" TIMESTAMPTZ,
    "due_at" DATE,
    "buyer_name" TEXT NOT NULL,
    "buyer_tax_id" TEXT,
    "buyer_branch_code" TEXT,
    "buyer_address" TEXT,
    "seller_name" TEXT NOT NULL,
    "seller_tax_id" TEXT,
    "seller_address" TEXT,
    "seller_branch_code" TEXT NOT NULL DEFAULT '00000',
    "price_includes_vat" BOOLEAN NOT NULL DEFAULT false,
    "subtotal_satang" INTEGER NOT NULL DEFAULT 0,
    "discount_satang" INTEGER NOT NULL DEFAULT 0,
    "vat_base_satang" INTEGER NOT NULL DEFAULT 0,
    "vat_satang" INTEGER NOT NULL DEFAULT 0,
    "exempt_satang" INTEGER NOT NULL DEFAULT 0,
    "grand_total_satang" INTEGER NOT NULL DEFAULT 0,
    "paid_satang" INTEGER NOT NULL DEFAULT 0,
    "balance_satang" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "issued_by_id" UUID,
    "voided_at" TIMESTAMPTZ,
    "voided_by_id" UUID,
    "void_reason" TEXT,
    "replaced_by_invoice_id" UUID,
    "pdf_key" TEXT,
    "etax_status" TEXT,
    "etax_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "charge_item_id" UUID,
    "item_type" "ChargeItemType" NOT NULL,
    "item_code" TEXT,
    "description" TEXT NOT NULL,
    "pet_name" TEXT,
    "qty" DECIMAL(12,4) NOT NULL,
    "unit_name" TEXT,
    "unit_price_satang" INTEGER NOT NULL,
    "discount_satang" INTEGER NOT NULL DEFAULT 0,
    "tax_code" "TaxCode" NOT NULL,
    "vat_rate_percent" DECIMAL(5,2) NOT NULL,
    "vat_satang" INTEGER NOT NULL,
    "amount_satang" INTEGER NOT NULL,
    "performed_by_name" TEXT,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "invoice_id" UUID,
    "owner_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount_satang" INTEGER NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_id" UUID NOT NULL,
    "shift_id" UUID,
    "reference" TEXT,
    "card_last4" TEXT,
    "gateway_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCEEDED',
    "voided_at" TIMESTAMPTZ,
    "void_reason" TEXT,
    "note" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "original_amount_satang" INTEGER NOT NULL,
    "correct_amount_satang" INTEGER NOT NULL,
    "difference_satang" INTEGER NOT NULL,
    "vat_satang" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_id" UUID NOT NULL,
    "pdf_key" TEXT,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BOOKING_DEPOSIT',
    "amount_satang" INTEGER NOT NULL,
    "balance_satang" INTEGER NOT NULL,
    "booking_id" UUID,
    "source_payment_id" UUID,
    "status" "DepositStatus" NOT NULL DEFAULT 'AVAILABLE',
    "expires_at" DATE,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashierShift" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "cashier_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "opening_float_satang" INTEGER NOT NULL DEFAULT 0,
    "expected_cash_satang" INTEGER,
    "counted_cash_satang" INTEGER,
    "variance_satang" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closing_note" TEXT,
    "closed_by_id" UUID,

    CONSTRAINT "CashierShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("tenant_id","branch_id","doc_type","period")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "is_vat_registered" BOOLEAN NOT NULL DEFAULT false,
    "vat_rate_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "tax_id" TEXT,
    "tax_branch_code" TEXT NOT NULL DEFAULT '00000',
    "seller_name" TEXT NOT NULL,
    "seller_address" TEXT NOT NULL,
    "prices_include_vat" BOOLEAN NOT NULL DEFAULT true,
    "abbreviated_approval_no" TEXT,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "receipt_footer_th" TEXT,
    "etax_enabled" BOOLEAN NOT NULL DEFAULT false,
    "etax_provider" TEXT,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'th',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template_key" TEXT NOT NULL,
    "owner_id" UUID,
    "to_address" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "error" TEXT,
    "provider_ref" TEXT,
    "dedupe_key" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderRule" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "offset_days" INTEGER NOT NULL,
    "send_at_local_time" TEXT NOT NULL DEFAULT '09:00',
    "channels" "NotificationChannel"[],
    "template_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenant_id_code_key" ON "Branch"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Membership_tenant_id_status_idx" ON "Membership"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenant_id_user_id_key" ON "Membership"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenant_id_key_key" ON "Role"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "AuditLog_tenant_id_entity_type_entity_id_idx" ON "AuditLog"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditLog_tenant_id_occurred_at_idx" ON "AuditLog"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_processed_at_created_at_idx" ON "OutboxEvent"("processed_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenant_id_key" ON "Subscription"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_tenant_id_key_key" ON "FeatureFlag"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_user_id_key" ON "Owner"("user_id");

-- CreateIndex
CREATE INDEX "Owner_tenant_id_last_name_first_name_idx" ON "Owner"("tenant_id", "last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_tenant_id_code_key" ON "Owner"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "OwnerPhone_tenant_id_digits_idx" ON "OwnerPhone"("tenant_id", "digits");

-- CreateIndex
CREATE INDEX "OwnerConsent_tenant_id_owner_id_type_idx" ON "OwnerConsent"("tenant_id", "owner_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Species_tenant_id_code_key" ON "Species"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "Breed_species_id_name_th_idx" ON "Breed"("species_id", "name_th");

-- CreateIndex
CREATE INDEX "Pet_tenant_id_owner_id_idx" ON "Pet"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "Pet_tenant_id_microchip_no_idx" ON "Pet"("tenant_id", "microchip_no");

-- CreateIndex
CREATE UNIQUE INDEX "Pet_tenant_id_code_key" ON "Pet"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "PetWeight_pet_id_measured_at_idx" ON "PetWeight"("pet_id", "measured_at");

-- CreateIndex
CREATE INDEX "PetAlert_pet_id_active_to_idx" ON "PetAlert"("pet_id", "active_to");

-- CreateIndex
CREATE INDEX "Vaccination_tenant_id_pet_id_administered_at_idx" ON "Vaccination"("tenant_id", "pet_id", "administered_at");

-- CreateIndex
CREATE INDEX "Vaccination_tenant_id_next_due_at_idx" ON "Vaccination"("tenant_id", "next_due_at");

-- CreateIndex
CREATE INDEX "Resource_tenant_id_branch_id_type_is_active_idx" ON "Resource"("tenant_id", "branch_id", "type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_tenant_id_branch_id_code_key" ON "Resource"("tenant_id", "branch_id", "code");

-- CreateIndex
CREATE INDEX "ResourceShift_resource_id_weekday_idx" ON "ResourceShift"("resource_id", "weekday");

-- CreateIndex
CREATE INDEX "ResourceTimeOff_resource_id_start_at_idx" ON "ResourceTimeOff"("resource_id", "start_at");

-- CreateIndex
CREATE INDEX "Booking_tenant_id_branch_id_start_at_idx" ON "Booking"("tenant_id", "branch_id", "start_at");

-- CreateIndex
CREATE INDEX "Booking_tenant_id_owner_id_start_at_idx" ON "Booking"("tenant_id", "owner_id", "start_at");

-- CreateIndex
CREATE INDEX "Booking_tenant_id_status_start_at_idx" ON "Booking"("tenant_id", "status", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tenant_id_code_key" ON "Booking"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "BookingResource_resource_id_start_at_end_at_idx" ON "BookingResource"("resource_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "WaitlistEntry_tenant_id_branch_id_status_preferred_from_idx" ON "WaitlistEntry"("tenant_id", "branch_id", "status", "preferred_from");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_booking_id_key" ON "Encounter"("booking_id");

-- CreateIndex
CREATE INDEX "Encounter_tenant_id_branch_id_status_arrived_at_idx" ON "Encounter"("tenant_id", "branch_id", "status", "arrived_at");

-- CreateIndex
CREATE INDEX "Encounter_tenant_id_pet_id_arrived_at_idx" ON "Encounter"("tenant_id", "pet_id", "arrived_at");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_tenant_id_number_key" ON "Encounter"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "VitalSign_encounter_id_recorded_at_idx" ON "VitalSign"("encounter_id", "recorded_at");

-- CreateIndex
CREATE INDEX "SoapNote_encounter_id_created_at_idx" ON "SoapNote"("encounter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCode_tenant_id_system_code_key" ON "DiagnosisCode"("tenant_id", "system", "code");

-- CreateIndex
CREATE INDEX "Problem_pet_id_status_idx" ON "Problem"("pet_id", "status");

-- CreateIndex
CREATE INDEX "ClinicalOrder_encounter_id_status_idx" ON "ClinicalOrder"("encounter_id", "status");

-- CreateIndex
CREATE INDEX "LabResult_order_id_panel_name_idx" ON "LabResult"("order_id", "panel_name");

-- CreateIndex
CREATE INDEX "Attachment_tenant_id_entity_type_entity_id_idx" ON "Attachment"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ConsentForm_tenant_id_pet_id_type_idx" ON "ConsentForm"("tenant_id", "pet_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentEstimate_encounter_id_key" ON "TreatmentEstimate"("encounter_id");

-- CreateIndex
CREATE INDEX "Prescription_tenant_id_pet_id_prescribed_at_idx" ON "Prescription"("tenant_id", "pet_id", "prescribed_at");

-- CreateIndex
CREATE INDEX "Prescription_tenant_id_status_idx" ON "Prescription"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "Dispense_tenant_id_branch_id_dispensed_at_idx" ON "Dispense"("tenant_id", "branch_id", "dispensed_at");

-- CreateIndex
CREATE INDEX "MedAdmin_tenant_id_stay_id_scheduled_at_idx" ON "MedAdmin"("tenant_id", "stay_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "MedAdmin_tenant_id_status_scheduled_at_idx" ON "MedAdmin"("tenant_id", "status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "Stay_booking_id_key" ON "Stay"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stay_encounter_id_key" ON "Stay"("encounter_id");

-- CreateIndex
CREATE INDEX "Stay_tenant_id_branch_id_status_expected_out_at_idx" ON "Stay"("tenant_id", "branch_id", "status", "expected_out_at");

-- CreateIndex
CREATE INDEX "Stay_tenant_id_pet_id_idx" ON "Stay"("tenant_id", "pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stay_tenant_id_code_key" ON "Stay"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "CareLog_stay_id_occurred_at_idx" ON "CareLog"("stay_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "GroomingJob_booking_id_key" ON "GroomingJob"("booking_id");

-- CreateIndex
CREATE INDEX "GroomingJob_tenant_id_branch_id_status_check_in_at_idx" ON "GroomingJob"("tenant_id", "branch_id", "status", "check_in_at");

-- CreateIndex
CREATE INDEX "GroomingJob_tenant_id_groomer_resource_id_check_in_at_idx" ON "GroomingJob"("tenant_id", "groomer_resource_id", "check_in_at");

-- CreateIndex
CREATE UNIQUE INDEX "GroomingJob_tenant_id_code_key" ON "GroomingJob"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "ServiceItem_tenant_id_category_is_active_idx" ON "ServiceItem"("tenant_id", "category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_tenant_id_code_key" ON "ServiceItem"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_tenant_id_code_key" ON "ServicePackage"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "Product_tenant_id_barcode_idx" ON "Product"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "Product_tenant_id_type_is_active_idx" ON "Product"("tenant_id", "type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenant_id_code_key" ON "Product"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_product_id_unit_name_key" ON "ProductUnit"("product_id", "unit_name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenant_id_code_key" ON "Supplier"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenant_id_branch_id_status_idx" ON "PurchaseOrder"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenant_id_number_key" ON "PurchaseOrder"("tenant_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_tenant_id_number_key" ON "GoodsReceipt"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "StockLot_tenant_id_branch_id_product_id_expiry_date_idx" ON "StockLot"("tenant_id", "branch_id", "product_id", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_tenant_id_branch_id_product_id_lot_no_key" ON "StockLot"("tenant_id", "branch_id", "product_id", "lot_no");

-- CreateIndex
CREATE INDEX "StockMovement_tenant_id_branch_id_product_id_occurred_at_idx" ON "StockMovement"("tenant_id", "branch_id", "product_id", "occurred_at");

-- CreateIndex
CREATE INDEX "StockMovement_tenant_id_ref_type_ref_id_idx" ON "StockMovement"("tenant_id", "ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "StockOnHand_tenant_id_branch_id_product_id_idx" ON "StockOnHand"("tenant_id", "branch_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_tenant_id_number_key" ON "StockTransfer"("tenant_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "StockCount_tenant_id_number_key" ON "StockCount"("tenant_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledDrugEntry_movement_id_key" ON "ControlledDrugEntry"("movement_id");

-- CreateIndex
CREATE INDEX "ControlledDrugEntry_tenant_id_branch_id_product_id_occurred_idx" ON "ControlledDrugEntry"("tenant_id", "branch_id", "product_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ChargeItem_tenant_id_owner_id_status_idx" ON "ChargeItem"("tenant_id", "owner_id", "status");

-- CreateIndex
CREATE INDEX "ChargeItem_tenant_id_branch_id_occurred_at_idx" ON "ChargeItem"("tenant_id", "branch_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ChargeItem_tenant_id_source_type_encounter_id_idx" ON "ChargeItem"("tenant_id", "source_type", "encounter_id");

-- CreateIndex
CREATE INDEX "PosSale_tenant_id_branch_id_opened_at_idx" ON "PosSale"("tenant_id", "branch_id", "opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "PosSale_tenant_id_number_key" ON "PosSale"("tenant_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_pos_sale_id_key" ON "Invoice"("pos_sale_id");

-- CreateIndex
CREATE INDEX "Invoice_tenant_id_owner_id_issued_at_idx" ON "Invoice"("tenant_id", "owner_id", "issued_at");

-- CreateIndex
CREATE INDEX "Invoice_tenant_id_branch_id_status_issued_at_idx" ON "Invoice"("tenant_id", "branch_id", "status", "issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenant_id_branch_id_doc_type_number_key" ON "Invoice"("tenant_id", "branch_id", "doc_type", "number");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_invoice_id_line_no_key" ON "InvoiceLine"("invoice_id", "line_no");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_branch_id_received_at_idx" ON "Payment"("tenant_id", "branch_id", "received_at");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_shift_id_idx" ON "Payment"("tenant_id", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_tenant_id_branch_id_number_key" ON "CreditNote"("tenant_id", "branch_id", "number");

-- CreateIndex
CREATE INDEX "Deposit_tenant_id_owner_id_status_idx" ON "Deposit"("tenant_id", "owner_id", "status");

-- CreateIndex
CREATE INDEX "CashierShift_tenant_id_branch_id_opened_at_idx" ON "CashierShift"("tenant_id", "branch_id", "opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_branch_id_key" ON "TaxProfile"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_tenant_id_key_channel_locale_key" ON "NotificationTemplate"("tenant_id", "key", "channel", "locale");

-- CreateIndex
CREATE INDEX "NotificationLog_tenant_id_status_scheduled_at_idx" ON "NotificationLog"("tenant_id", "status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_tenant_id_dedupe_key_key" ON "NotificationLog"("tenant_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderRule_tenant_id_type_offset_days_key" ON "ReminderRule"("tenant_id", "type", "offset_days");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBranch" ADD CONSTRAINT "MembershipBranch_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "Permission"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_key_fkey" FOREIGN KEY ("plan_key") REFERENCES "Plan"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerPhone" ADD CONSTRAINT "OwnerPhone_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerConsent" ADD CONSTRAINT "OwnerConsent_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Breed" ADD CONSTRAINT "Breed_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_breed_id_fkey" FOREIGN KEY ("breed_id") REFERENCES "Breed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetWeight" ADD CONSTRAINT "PetWeight_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetWeight" ADD CONSTRAINT "PetWeight_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetAlert" ADD CONSTRAINT "PetAlert_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetOwnerHistory" ADD CONSTRAINT "PetOwnerHistory_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KennelProfile" ADD CONSTRAINT "KennelProfile_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceShift" ADD CONSTRAINT "ResourceShift_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTimeOff" ADD CONSTRAINT "ResourceTimeOff_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingResource" ADD CONSTRAINT "BookingResource_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingResource" ADD CONSTRAINT "BookingResource_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapAddendum" ADD CONSTRAINT "SoapAddendum_soap_note_id_fkey" FOREIGN KEY ("soap_note_id") REFERENCES "SoapNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_diagnosis_code_id_fkey" FOREIGN KEY ("diagnosis_code_id") REFERENCES "DiagnosisCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ClinicalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentEstimate" ADD CONSTRAINT "TreatmentEstimate_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedAdmin" ADD CONSTRAINT "MedAdmin_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedAdmin" ADD CONSTRAINT "MedAdmin_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_kennel_resource_id_fkey" FOREIGN KEY ("kennel_resource_id") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayKennelMove" ADD CONSTRAINT "StayKennelMove_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLog" ADD CONSTRAINT "CareLog_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingJob" ADD CONSTRAINT "GroomingJob_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingJob" ADD CONSTRAINT "GroomingJob_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingJob" ADD CONSTRAINT "GroomingJob_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingJob" ADD CONSTRAINT "GroomingJob_groomer_resource_id_fkey" FOREIGN KEY ("groomer_resource_id") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingPreference" ADD CONSTRAINT "GroomingPreference_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageLine" ADD CONSTRAINT "ServicePackageLine_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageLine" ADD CONSTRAINT "ServicePackageLine_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageLine" ADD CONSTRAINT "ServicePackageLine_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "StockLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_dispense_id_fkey" FOREIGN KEY ("dispense_id") REFERENCES "Dispense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOnHand" ADD CONSTRAINT "StockOnHand_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOnHand" ADD CONSTRAINT "StockOnHand_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_grooming_job_id_fkey" FOREIGN KEY ("grooming_job_id") REFERENCES "GroomingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_pos_sale_id_fkey" FOREIGN KEY ("pos_sale_id") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_product_unit_id_fkey" FOREIGN KEY ("product_unit_id") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_pos_sale_id_fkey" FOREIGN KEY ("pos_sale_id") REFERENCES "PosSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_replaced_by_invoice_id_fkey" FOREIGN KEY ("replaced_by_invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
