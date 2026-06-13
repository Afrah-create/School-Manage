import "dotenv/config";
import { pool, tenantContext } from "../src/config/db";
import { getDefaultTenantId } from "../src/config/tenant";
import {
  getStructureStatus,
  provisionStructure,
} from "../src/modules/academic/structureMaintenance";

/**
 * Seeds academic structure (terms + default classes) for a tenant.
 *
 * Usage:
 *   npm run seed:structure -- --year=<uuid>
 *   npm run seed:structure -- --create-year --template=BOTH
 *   npm run seed:structure -- --all-tenants --year=<uuid> --template=O_LEVEL_S1_S4
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const allTenants = args.includes("--all-tenants");
  const createYear = args.includes("--create-year");
  const yearId = args.find((a) => a.startsWith("--year="))?.split("=")[1]?.trim();
  const templateArg = args.find((a) => a.startsWith("--template="))?.split("=")[1]?.trim();
  const classTemplate =
    templateArg === "O_LEVEL_S1_S4" ||
    templateArg === "A_LEVEL_S5_S6" ||
    templateArg === "NONE"
      ? templateArg
      : "BOTH";

  const tenantIds = allTenants
    ? (await pool.query<{ id: string }>(`SELECT id FROM tenants ORDER BY slug`)).rows.map((r) => r.id)
    : [await getDefaultTenantId()];

  for (const tenantId of tenantIds) {
    await tenantContext.run(tenantId, async () => {
      if (!yearId && !createYear) {
        throw new Error("Provide --year=<academicYearId> or --create-year");
      }

      const statusBefore = yearId ? await getStructureStatus(yearId) : await getStructureStatus();
      console.log(`[tenant ${tenantId}] status before:`, statusBefore);

      const result = await provisionStructure(
        createYear
          ? {
              createYear: {
                name: `${new Date().getFullYear()} Academic Year`,
                startDate: `${new Date().getFullYear()}-02-01`,
                endDate: `${new Date().getFullYear() + 1}-12-15`,
                isActive: true,
              },
              activateYear: true,
              installTerms: true,
              classTemplate,
            }
          : {
              academicYearId: yearId!,
              installTerms: true,
              classTemplate,
            },
      );
      console.log(`[tenant ${tenantId}] provisioned:`, result);

      const statusAfter = await getStructureStatus(result.academicYearId);
      console.log(`[tenant ${tenantId}] status after:`, statusAfter);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
