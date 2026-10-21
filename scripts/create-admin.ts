import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
    for (const line of envFile.split("\n")) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*"?([^"\n]+)"?/);
      if (match?.[1] && match[2]) process.env[match[1]] = match[2];
    }
  } catch {}
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const FIRM_ID = "firm_electronic_erp";
const FY = "26-27";

async function main() {
  console.log("Setting up Electronic ERP firm, head office branch, and admin users...");

  // Update any existing firm or create new
  let firm = await prisma.firm.findFirst();
  if (firm) {
    firm = await prisma.firm.update({
      where: { id: firm.id },
      data: {
        code: "ELEC_ERP",
        name: "Electronic ERP Pvt Ltd",
        legalName: "Electronic ERP Private Limited",
        displayName: "Electronic ERP",
        email: "contact@electronic-erp.example",
        website: "www.electronic-erp.example",
      },
    });
    console.log("Updated firm to Electronic ERP:", firm.displayName);
  } else {
    firm = await prisma.firm.create({
      data: {
        id: FIRM_ID,
        code: "ELEC_ERP",
        name: "Electronic ERP Pvt Ltd",
        legalName: "Electronic ERP Private Limited",
        displayName: "Electronic ERP",
        gstin: "29AAKCT1234F1ZP",
        pan: "AAKCT1234F",
        addressLine: "Electronics City Phase 1",
        city: "Bengaluru",
        state: "Karnataka",
        stateCode: "29",
        pincode: "560100",
        phone: "08049001200",
        email: "contact@electronic-erp.example",
        website: "www.electronic-erp.example",
        financialYear: FY,
        status: "ACTIVE",
      },
    });
    console.log("Created firm:", firm.displayName);
  }

  let headOffice = await prisma.branch.findFirst({
    where: { firmId: firm.id, type: "HEAD_OFFICE" },
  });
  if (!headOffice) {
    headOffice = await prisma.branch.create({
      data: {
        firmId: firm.id,
        code: "HO",
        name: "Head Office — Electronics City",
        type: "HEAD_OFFICE",
        addressLine: "Electronics City Phase 1",
        city: "Bengaluru",
        state: "Karnataka",
        stateCode: "29",
        pincode: "560100",
        phone: "08049001200",
        email: "contact@electronic-erp.example",
        gstin: "29AAKCT1234F1ZP",
      },
    });
    console.log("Created branch:", headOffice.name);
  } else {
    console.log("Head Office branch ready:", headOffice.name);
  }

  // Create Super Admin (900001)
  const superAdmin = await prisma.user.upsert({
    where: { accessCode: "900001" },
    create: {
      firmId: firm.id,
      employeeCode: "EMP0001",
      name: "Super Admin",
      email: "admin@electronic-erp.example",
      phone: "9876543210",
      accessCode: "900001",
      role: "PLATFORM_ADMIN",
      branchId: headOffice.id,
      status: "ACTIVE",
      accessView: "COMBINED",
    },
    update: {
      name: "Super Admin",
      email: "admin@electronic-erp.example",
      status: "ACTIVE",
      role: "PLATFORM_ADMIN",
      branchId: headOffice.id,
      firmId: firm.id,
    },
  });
  console.log("Super Admin ready: Code 900001 (role: PLATFORM_ADMIN)");

  // Create GST Reconciliation Admin (900000)
  const gstAdmin = await prisma.user.upsert({
    where: { accessCode: "900000" },
    create: {
      firmId: firm.id,
      employeeCode: "EMP0000",
      name: "GST Reconciliation Admin",
      email: "gst@electronic-erp.example",
      phone: "9876543211",
      accessCode: "900000",
      role: "ADMIN",
      branchId: headOffice.id,
      status: "ACTIVE",
      accessView: "GST_ONLY",
    },
    update: {
      name: "GST Reconciliation Admin",
      email: "gst@electronic-erp.example",
      status: "ACTIVE",
      role: "ADMIN",
      branchId: headOffice.id,
      firmId: firm.id,
    },
  });
  console.log("GST Admin ready: Code 900000 (role: ADMIN)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
