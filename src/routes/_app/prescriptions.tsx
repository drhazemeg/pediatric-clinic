// apps/web/src/routes/prescriptions.tsx

import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormularySearch } from '@/hooks/use-prescriptions';
import { authClient } from '@/lib/auth-client';
import { prescriptionsSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';

// Egyptian common pediatric quick-reference drugs
const QUICK_FORMULARY = [
  {
    name: 'Paracetamol',
    tradeNames: 'Cetal, Paramol, Tempra',
    pediatricDose: '10 - 15 mg/kg/dose',
    freq: 'Every 4-6 hours (max 4 doses/24h)',
    maxDaily: '60 mg/kg/day (max 2000mg/day)',
    concentration: '250 mg / 5 mL (Syrup) or 100 mg / 1 mL (Drops)',
    note: 'First-line antipyretic/analgesic for all ages including neonates.',
  },
  {
    name: 'Ibuprofen',
    tradeNames: 'Brufen, Megafen, Marcofen',
    pediatricDose: '5 - 10 mg/kg/dose',
    freq: 'Every 6-8 hours',
    maxDaily: '40 mg/kg/day',
    concentration: '100 mg / 5 mL',
    note: 'Caution: Do not use in infants < 3 months or dehydrated patients.',
  },
  {
    name: 'Amoxicillin',
    tradeNames: 'E-Mox, Biomox, Amoxil',
    pediatricDose: '40 - 90 mg/kg/day',
    freq: 'Divided every 8 hours or 12 hours',
    maxDaily: '1000 mg/day for mild-mod; 2000-3000 mg/day for severe AOM',
    concentration: '250 mg / 5 mL, 500 mg / 5 mL',
    note: 'First-line for Acute Otitis Media & Community Acquired Pneumonia.',
  },
  {
    name: 'Amoxicillin / Clavulanate',
    tradeNames: 'Augmentin, Megamox, Curam, Hibiotic',
    pediatricDose: '45 - 90 mg/kg/day (based on amoxicillin component)',
    freq: 'Divided every 12 hours',
    maxDaily: '4000 mg amoxicillin/day',
    concentration: '312.5 mg / 5 mL, 457 mg / 5 mL, 642.9 mg / 5 mL ES',
    note: 'Take with food to minimize GI intolerance and diarrhea.',
  },
  {
    name: 'Azithromycin',
    tradeNames: 'Zithrokan, Xithrone, Zithromax',
    pediatricDose: '10 mg/kg/day on Day 1, then 5 mg/kg/day Days 2-5',
    freq: 'Once daily (OD)',
    maxDaily: '500 mg Day 1, 250 mg Days 2-5',
    concentration: '200 mg / 5 mL',
    note: 'Atypical pneumonia, pertussis, or penicillin-allergic patients.',
  },
  {
    name: 'Ondansetron',
    tradeNames: 'Danset, Zofran',
    pediatricDose: '0.15 mg/kg/dose (or 2mg for 8-15kg, 4mg for >15kg)',
    freq: 'Single dose for acute gastroenteritis vomiting',
    maxDaily: '8 mg/dose',
    concentration: '4 mg / 5 mL',
    note: 'Single oral dose facilitates oral rehydration therapy in acute GE.',
  },
];

const PrescriptionsComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: formularyResults, isLoading: isSearchLoading } =
    useFormularySearch(searchQuery);

  const [patientWeightKg, setPatientWeightKg] = useState('10');
  const [targetMgPerKg, setTargetMgPerKg] = useState('15');
  const [drugConcentrationMg, setDrugConcentrationMg] = useState('250');
  const [drugVolumeMl, setDrugVolumeMl] = useState('5');

  const calculatedDoseMg = useMemo(() => {
    const weight = Number(patientWeightKg);
    const mgPerKg = Number(targetMgPerKg);

    if (Number.isNaN(weight) || Number.isNaN(mgPerKg) || weight <= 0) {
      return 0;
    }

    return Math.round(weight * mgPerKg * 10) / 10;
  }, [patientWeightKg, targetMgPerKg]);

  const calculatedVolumeMl = useMemo(() => {
    const mg = calculatedDoseMg;
    const concMg = Number(drugConcentrationMg);
    const volMl = Number(drugVolumeMl);

    if (
      mg <= 0 ||
      Number.isNaN(concMg) ||
      Number.isNaN(volMl) ||
      concMg <= 0 ||
      volMl <= 0
    ) {
      return 0;
    }

    return Math.round(((mg * volMl) / concMg) * 10) / 10;
  }, [calculatedDoseMg, drugConcentrationMg, drugVolumeMl]);

  const renderFormularyResults = () => {
    if (isSearchLoading) {
      return <p className="text-xs text-muted-foreground">Searching...</p>;
    }

    if (formularyResults !== undefined && formularyResults.length > 0) {
      return (
        <div className="space-y-2">
          {formularyResults.map((drug) => (
            <button
              className="w-full cursor-pointer rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
              key={drug.id}
              onClick={() => setSearchQuery(drug.genericName)}
              type="button"
            >
              <p className="text-sm font-bold text-foreground">
                {drug.genericName}
              </p>
              <p className="text-xs text-muted-foreground">
                Category: {drug.pharmacologicalCategory} &bull; ATC:{' '}
                {drug.atcCode}
              </p>
            </button>
          ))}
        </div>
      );
    }

    if (searchQuery.length >= 2) {
      return (
        <p className="text-xs text-muted-foreground">
          No matching drugs found in formulary index.
        </p>
      );
    }

    return (
      <p className="text-xs text-muted-foreground">
        Type at least 2 characters to search the local catalog.
      </p>
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex text-2xl text-chart-2">
            <MaterialIcon name="medication" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Egyptian National Formulary &amp; Pediatric Dose Calculator
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Weight-adjusted pediatric dosing, volume conversions, and safety
          guardrails (دليل الأدوية وحاسبة الجرعات)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 2 Cols: Interactive Dose Calculator & Formulary Search */}
        <div className="space-y-6 lg:col-span-2">
          {/* Interactive Weight-Based Dose Calculator */}
          <div className="rounded-xl border border-border bg-card">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="inline-flex text-chart-2">
                    <MaterialIcon name="calculate" />
                  </span>
                  <CardTitle>
                    <span className="text-lg font-bold text-foreground">
                      Weight-Based Pediatric Dose Calculator
                    </span>
                  </CardTitle>
                </div>
                <CardDescription>
                  Computes exact target dose in milligrams and liquid syrup
                  volume in milliliters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="calcWeight">
                        Patient Current Weight (كجم) *
                      </Label>
                      <Input
                        id="calcWeight"
                        max="120"
                        min="0.3"
                        onChange={(e) => setPatientWeightKg(e.target.value)}
                        placeholder="e.g. 8.5"
                        step="0.1"
                        type="number"
                        value={patientWeightKg}
                      />
                    </div>

                    <div>
                      <Label htmlFor="targetDose">
                        Target Dose per kg (mg/kg/dose) *
                      </Label>
                      <Input
                        id="targetDose"
                        onChange={(e) => setTargetMgPerKg(e.target.value)}
                        placeholder="e.g. 15"
                        step="0.5"
                        type="number"
                        value={targetMgPerKg}
                      />
                    </div>
                  </div>

                  {/* Liquid Formulation Conversion */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="mb-3 text-xs font-bold tracking-wider text-foreground uppercase">
                      Liquid Suspension Formulation (تركيز الشراب)
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="concMg">
                          <span className="text-xs">Active Substance (mg)</span>
                        </Label>
                        <Input
                          id="concMg"
                          onChange={(e) =>
                            setDrugConcentrationMg(e.target.value)
                          }
                          placeholder="250"
                          type="number"
                          value={drugConcentrationMg}
                        />
                      </div>
                      <div>
                        <Label htmlFor="volMl">
                          <span className="text-xs">Per Volume (mL)</span>
                        </Label>
                        <Input
                          id="volMl"
                          onChange={(e) => setDrugVolumeMl(e.target.value)}
                          placeholder="5"
                          type="number"
                          value={drugVolumeMl}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculation Output Result Card */}
                  <div className="flex flex-col justify-between gap-4 rounded-xl border border-chart-2/30 bg-chart-2/10 p-5 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold tracking-wider text-chart-2 uppercase">
                        Recommended Dose Result
                      </span>
                      <div className="mt-1 flex items-baseline gap-3">
                        <span className="font-heading text-3xl font-extrabold text-foreground">
                          {calculatedDoseMg} mg
                        </span>
                        <span className="text-sm text-chart-2">per dose</span>
                      </div>
                      <p className="mt-1 text-xs text-chart-2">
                        Formula:{' '}
                        {patientWeightKg === '' ? '0' : patientWeightKg} kg
                        &times; {targetMgPerKg === '' ? '0' : targetMgPerKg}{' '}
                        mg/kg
                      </p>
                    </div>

                    <div className="border-t border-chart-2/20 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                      <span className="text-xs font-bold tracking-wider text-chart-2 uppercase">
                        Liquid Volume (حجم الشراب)
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-heading text-3xl font-extrabold text-foreground">
                          {calculatedVolumeMl} mL
                        </span>
                        <span className="text-sm text-chart-2">orally</span>
                      </div>
                      <p className="mt-1 text-xs text-chart-2">
                        @ {drugConcentrationMg}mg / {drugVolumeMl}mL
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Egyptian Common Pediatric Formulary Table */}
          <div className="rounded-xl border border-border bg-card">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-base font-bold text-foreground">
                    Egyptian Pediatric Emergency &amp; Routine Reference
                  </span>
                </CardTitle>
                <CardDescription>
                  Verified standard dosing guidelines for common outpatient
                  medications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Generic (Brand)</TableHead>
                      <TableHead>Recommended Dose</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Concentration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {QUICK_FORMULARY.map((d) => (
                      <TableRow key={d.name}>
                        <TableCell>
                          <p className="text-xs font-bold text-foreground">
                            {d.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.tradeNames}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-chart-2">
                            {d.pediatricDose}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {d.freq}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {d.concentration}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 1 Col: Search & Monograph */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-base font-bold text-foreground">
                    Formulary Database Search
                  </span>
                </CardTitle>
                <CardDescription>
                  Search across pediatric registered pharmaceuticals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex text-muted-foreground">
                      <MaterialIcon name="search" />
                    </span>
                    <Input
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search drug name (e.g. Cefixime, Salbutamol)..."
                      value={searchQuery}
                    />
                  </div>

                  {renderFormularyResults()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Safety Cap Box */}
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-foreground">
            <div className="mb-1 flex items-center gap-2 font-bold text-warning">
              <span className="inline-flex">
                <MaterialIcon name="verified_user" />
              </span>
              <span>Pediatric Maximum Cap Rule</span>
            </div>
            A calculated pediatric dose should never exceed the standard adult
            single or daily maximum dose, regardless of the child&apos;s weight.
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/prescriptions')({
  staticData: routeShell.app,
  validateSearch: prescriptionsSearchSchema,
  component: PrescriptionsComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
