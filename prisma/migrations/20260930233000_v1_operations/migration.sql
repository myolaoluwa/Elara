-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('DRAFT', 'COMPLETE', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BriefingType" AS ENUM ('DAILY', 'MEETING', 'TRAVEL', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TravelStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ACTIVE', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'DUE', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventPlanStatus" AS ENUM ('DRAFT', 'PLANNING', 'CONFIRMED', 'COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING', 'WAITING_APPROVAL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggerDataJson" TEXT NOT NULL DEFAULT '{}',
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "resultJson" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "question" TEXT,
    "summary" TEXT,
    "findingsJson" TEXT NOT NULL DEFAULT '[]',
    "sourcesJson" TEXT NOT NULL DEFAULT '[]',
    "status" "ResearchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "BriefingType" NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "contentJson" TEXT NOT NULL,
    "sourceIdsJson" TEXT NOT NULL DEFAULT '[]',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "executiveId" TEXT,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "TravelStatus" NOT NULL DEFAULT 'DRAFT',
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelItineraryItem" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'meeting',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,

    CONSTRAINT "TravelItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelReminder" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TravelReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "departureAirport" TEXT NOT NULL,
    "arrivalAirport" TEXT NOT NULL,
    "departsAt" TIMESTAMP(3) NOT NULL,
    "arrivesAt" TIMESTAMP(3) NOT NULL,
    "confirmationCode" TEXT,
    "cabin" TEXT,
    "notes" TEXT,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelStay" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "address" TEXT,
    "checksInAt" TIMESTAMP(3) NOT NULL,
    "checksOutAt" TIMESTAMP(3) NOT NULL,
    "confirmationCode" TEXT,
    "phone" TEXT,
    "notes" TEXT,

    CONSTRAINT "HotelStay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroundTransport" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT,
    "confirmationCode" TEXT,
    "notes" TEXT,

    CONSTRAINT "GroundTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelDocument" (
    "id" TEXT NOT NULL,
    "travelPlanId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "TravelDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "reimbursedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportId" TEXT,
    "vendorId" TEXT,
    "receiptId" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "reimbursable" BOOLEAN NOT NULL DEFAULT true,
    "extractedJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "description" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "renewalAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContact" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,

    CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQuote" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContract" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "renewalAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,

    CONSTRAINT "VendorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'due',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "EventPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "budgetMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "travelPlanId" TEXT,
    "cateringNotes" TEXT,
    "accommodationNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "rsvp" TEXT NOT NULL DEFAULT 'pending',
    "plusOnes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "invitedAt" TIMESTAMP(3),

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventVendor" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "amountMinor" INTEGER,

    CONSTRAINT "EventVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventScheduleItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "owner" TEXT,
    "notes" TEXT,

    CONSTRAINT "EventScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAttachment_documentId_idx" ON "TaskAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAttachment_taskId_documentId_key" ON "TaskAttachment"("taskId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentFolder_organizationId_name_idx" ON "DocumentFolder"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolder_organizationId_parentId_name_key" ON "DocumentFolder"("organizationId", "parentId", "name");

-- CreateIndex
CREATE INDEX "AutomationRun_automationId_status_createdAt_idx" ON "AutomationRun"("automationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryItem_organizationId_category_confirmed_idx" ON "MemoryItem"("organizationId", "category", "confirmed");

-- CreateIndex
CREATE INDEX "MemoryItem_organizationId_updatedAt_idx" ON "MemoryItem"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "ResearchReport_organizationId_status_updatedAt_idx" ON "ResearchReport"("organizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Briefing_organizationId_type_createdAt_idx" ON "Briefing"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "TravelPlan_organizationId_startsAt_idx" ON "TravelPlan"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "TravelPlan_organizationId_status_idx" ON "TravelPlan"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TravelItineraryItem_travelPlanId_startsAt_idx" ON "TravelItineraryItem"("travelPlanId", "startsAt");

-- CreateIndex
CREATE INDEX "TravelReminder_travelPlanId_remindAt_idx" ON "TravelReminder"("travelPlanId", "remindAt");

-- CreateIndex
CREATE INDEX "Flight_travelPlanId_departsAt_idx" ON "Flight"("travelPlanId", "departsAt");

-- CreateIndex
CREATE INDEX "HotelStay_travelPlanId_checksInAt_idx" ON "HotelStay"("travelPlanId", "checksInAt");

-- CreateIndex
CREATE INDEX "GroundTransport_travelPlanId_pickupAt_idx" ON "GroundTransport"("travelPlanId", "pickupAt");

-- CreateIndex
CREATE UNIQUE INDEX "TravelDocument_travelPlanId_documentId_key" ON "TravelDocument"("travelPlanId", "documentId");

-- CreateIndex
CREATE INDEX "ExpenseReport_organizationId_status_createdAt_idx" ON "ExpenseReport"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Expense_organizationId_status_incurredAt_idx" ON "Expense"("organizationId", "status", "incurredAt");

-- CreateIndex
CREATE INDEX "Expense_reportId_idx" ON "Expense"("reportId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_dueAt_idx" ON "Invoice"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_status_renewalAt_idx" ON "Vendor"("organizationId", "status", "renewalAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_organizationId_name_key" ON "Vendor"("organizationId", "name");

-- CreateIndex
CREATE INDEX "VendorContact_vendorId_idx" ON "VendorContact"("vendorId");

-- CreateIndex
CREATE INDEX "VendorQuote_vendorId_status_idx" ON "VendorQuote"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorContract_vendorId_renewalAt_idx" ON "VendorContract"("vendorId", "renewalAt");

-- CreateIndex
CREATE INDEX "VendorPayment_vendorId_status_dueAt_idx" ON "VendorPayment"("vendorId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "EventPlan_organizationId_startsAt_idx" ON "EventPlan"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "EventPlan_organizationId_status_idx" ON "EventPlan"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EventPlan_travelPlanId_idx" ON "EventPlan"("travelPlanId");

-- CreateIndex
CREATE INDEX "EventGuest_eventId_rsvp_idx" ON "EventGuest"("eventId", "rsvp");

-- CreateIndex
CREATE UNIQUE INDEX "EventVendor_eventId_vendorId_purpose_key" ON "EventVendor"("eventId", "vendorId", "purpose");

-- CreateIndex
CREATE INDEX "EventScheduleItem_eventId_startsAt_idx" ON "EventScheduleItem"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "Document_organizationId_folderId_idx" ON "Document"("organizationId", "folderId");

-- CreateIndex
CREATE INDEX "Document_parentId_versionNumber_idx" ON "Document"("parentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryItem" ADD CONSTRAINT "MemoryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlan" ADD CONSTRAINT "TravelPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelPlan" ADD CONSTRAINT "TravelPlan_executiveId_fkey" FOREIGN KEY ("executiveId") REFERENCES "Executive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelItineraryItem" ADD CONSTRAINT "TravelItineraryItem_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelReminder" ADD CONSTRAINT "TravelReminder_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelStay" ADD CONSTRAINT "HotelStay_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroundTransport" ADD CONSTRAINT "GroundTransport_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelDocument" ADD CONSTRAINT "TravelDocument_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelDocument" ADD CONSTRAINT "TravelDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExpenseReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPlan" ADD CONSTRAINT "EventPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPlan" ADD CONSTRAINT "EventPlan_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVendor" ADD CONSTRAINT "EventVendor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVendor" ADD CONSTRAINT "EventVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScheduleItem" ADD CONSTRAINT "EventScheduleItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

