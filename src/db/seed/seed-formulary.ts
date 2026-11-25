import { drizzle } from 'drizzle-orm/node-postgres';

import { EGYPTIAN_NATIONAL_FORMULARY } from '@/lib/features/medications/formulary/egyptianNationalFormulary';
import { NEONATAL_PEDIATRIC_FORMULARY } from '@/lib/features/medications/formulary/neonatalDrugs';

import { loadDatabaseUrl } from '../database-url';
import * as schema from '../schema';

const db = drizzle(loadDatabaseUrl());

const seedDrugFormulary = async () => {
  console.log('\n💊 Seeding Egyptian National Drug Formulary…');

  const rows = EGYPTIAN_NATIONAL_FORMULARY.map((drug) => ({
    id: drug.id,
    genericName: drug.genericName,
    pharmacologicalCategory: drug.pharmacologicalCategory,
    atcCode: drug.atcCode,
    awareClassification: drug.awareClassification,
    data: drug,
  })) satisfies Array<typeof schema.drugFormulary.$inferInsert>;

  await db.insert(schema.drugFormulary).values(rows).onConflictDoNothing();
  console.log(`   ✔ ${rows.length} drugs in Egyptian National Formulary`);
};

const seedNeonatalFormulary = async () => {
  console.log('\n👶 Seeding Neonatal & Pediatric Drug Formulary…');

  const rows = NEONATAL_PEDIATRIC_FORMULARY.map((drug) => ({
    id: drug.id,
    name: drug.name,
    genericName: drug.genericName,
    category: drug.category,
    data: drug,
  })) satisfies Array<typeof schema.neonatalFormulary.$inferInsert>;

  await db.insert(schema.neonatalFormulary).values(rows).onConflictDoNothing();
  console.log(`   ✔ ${rows.length} drugs in Neonatal & Pediatric Formulary`);
};

export async function seedFormulary() {
  await seedDrugFormulary();
  await seedNeonatalFormulary();
}
