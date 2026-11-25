// apps/web/src/routes/_app/patients.index.tsx

import {calculateAgeString} from "@/lib/dates";
import {
    isoDateSchema,
    optionalNumberInRange,
    optionalText,
    patientSexSchema,
    requiredText
} from "@/lib/helpers";
import {useForm} from "@tanstack/react-form";
import {createFileRoute, Link, redirect} from "@tanstack/react-router";
import {
    type ColumnDef,
    createSortedRowModel,
    rowSortingFeature,
    type SortingState,
    sortFn_alphanumeric,
    sortFn_basic,
    tableFeatures,
    useTable
} from "@tanstack/react-table";
import {useCallback, useMemo, useState} from "react";
import {z} from "zod";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@/components/ui/empty";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {MaterialIcon} from "@/components/ui/MaterialIcon";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {Textarea} from "@/components/ui/textarea";
import {useActiveClinicId} from "@/hooks/use-active-clinic";
import {useCreatePatient, usePatientList} from "@/hooks/use-patients";
import {useEnqueuePatient} from "@/hooks/use-queue";
import {authClient} from "@/lib/auth-client";
import {patientsSearchSchema} from "@/lib/web/route-search-schemas";
import {routeShell} from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/patients/")({
	staticData: routeShell.app,
	validateSearch: patientsSearchSchema,
	component: PatientsComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

interface PatientRow {
	id: string;
	mrn: string;
	firstName: string;
	lastName: string;
	sex: "male" | "female";
	dateOfBirth: string;
	phone?: string | null;
	parentName?: string | null;
	parentPhone?: string | null;
	allergies?: string | null;
	weightKg?: number | null;
	gestationalAgeWeeks?: number | null;
	birthWeightKg?: number | null;
}

const patientTableFeatures = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		basic: sortFn_basic
	}
});

const registerPatientSchema = z.object({
	mrn: requiredText(50, 2),
	firstName: requiredText(100),
	lastName: requiredText(100),
	dateOfBirth: isoDateSchema,
	sex: patientSexSchema,
	gestationalAgeWeeks: optionalNumberInRange(20, 45, "Gestational age"),
	birthWeightKg: optionalNumberInRange(0.3, 10, "Birth weight"),
	birthLengthCm: optionalNumberInRange(20, 70, "Birth length"),
	birthHeadCircumferenceCm: optionalNumberInRange(
		15,
		50,
		"Birth head circumference"
	),
	parentName: optionalText(120),
	parentPhone: optionalText(20),
	weightKg: optionalNumberInRange(0.3, 150, "Current weight"),
	allergies: optionalText(1000),
	notes: optionalText(2000)
});

function PatientsComponent() {
	const clinicId = useActiveClinicId();
	const [searchQuery, setSearchQuery] = useState("");
	const [sexFilter, setSexFilter] = useState<"all" | "male" | "female">("all");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [isRegisterOpen, setIsRegisterOpen] = useState(false);

	const { patients, total, isLoading } = usePatientList({
		clinicId,
		search: searchQuery
	});

	const { create: createPatient, isPending: isCreating } = useCreatePatient();
	const enqueueMutation = useEnqueuePatient();

	const form = useForm({
		defaultValues: {
			mrn: "",
			firstName: "",
			lastName: "",
			dateOfBirth: "",
			sex: "male" as "male" | "female",
			gestationalAgeWeeks: "",
			birthWeightKg: "",
			birthLengthCm: "",
			birthHeadCircumferenceCm: "",
			parentName: "",
			parentPhone: "",
			weightKg: "",
			allergies: "",
			notes: ""
		},
		onSubmit: async ({ value }) => {
			const parsed = registerPatientSchema.safeParse(value);
			if (!parsed.success) return;

			const v = parsed.data;
			await createPatient({
				clinicId,
				mrn: v.mrn,
				firstName: v.firstName,
				lastName: v.lastName,
				sex: v.sex,
				dateOfBirth: v.dateOfBirth,
				phone: v.parentPhone,
				parentName: v.parentName,
				parentPhone: v.parentPhone,
				allergies: v.allergies,
				weightKg: v.weightKg,
				gestationalAgeWeeks: v.gestationalAgeWeeks,
				birthWeightKg: v.birthWeightKg,
				birthLengthCm: v.birthLengthCm,
				birthHeadCircumferenceCm: v.birthHeadCircumferenceCm,
				notes: v.notes
			});

			form.reset();
			setIsRegisterOpen(false);
		}
	});

	const handleQuickEnqueue = useCallback(
		async (patientId: string) => {
			await enqueueMutation.mutateAsync({
				clinicId,
				patientId,
				priority: 0
			});
		},
		[clinicId, enqueueMutation]
	);

	const filteredRows = useMemo<PatientRow[]>(() => {
		const list = (patients ?? []) as unknown as PatientRow[];
		if (sexFilter === "all") return list;
		return list.filter(p => p.sex === sexFilter);
	}, [patients, sexFilter]);

	const columns = useMemo<ColumnDef<typeof patientTableFeatures, PatientRow>[]>(
		() => [
			{
				accessorKey: "mrn",
				header: "MRN",
				sortFn: "alphanumeric",
				cell: ({ row }) => (
					<span className='font-mono text-xs font-bold text-[var(--clay-black)]'>
						{row.original.mrn}
					</span>
				)
			},
			{
				id: "fullName",
				accessorFn: row => `${row.firstName} ${row.lastName}`,
				header: "Child Name",
				sortFn: "alphanumeric",
				cell: ({ row }) => {
					const p = row.original;
					return (
						<div>
							<Link
								className='font-semibold text-[var(--clay-black)] hover:underline'
								params={{ patientId: p.id }}
								to='/patients/$patientId'
							>
								{p.firstName} {p.lastName}
							</Link>
							{p.parentName && (
								<p className='text-xs text-[var(--warm-charcoal)]/70'>
									G: {p.parentName}
								</p>
							)}
						</div>
					);
				}
			},
			{
				id: "age",
				accessorFn: row => new Date(row.dateOfBirth).getTime(),
				header: "Age",
				sortFn: "basic",
				cell: ({ row }) => (
					<span className='text-sm text-[var(--warm-charcoal)]'>
						{calculateAgeString(row.original.dateOfBirth)}
					</span>
				)
			},
			{
				accessorKey: "sex",
				header: "Sex",
				sortFn: "alphanumeric",
				cell: ({ row }) => {
					const isBoy = row.original.sex === "male";
					return (
						<Badge variant={isBoy ? "info" : "warning"}>
							{row.original.sex}
						</Badge>
					);
				}
			},
			{
				id: "neonatal",
				accessorFn: row => row.gestationalAgeWeeks ?? 0,
				header: "Neonatal (GA / BW)",
				sortFn: "basic",
				cell: ({ row }) => {
					const p = row.original;
					return (
						<span className='text-xs text-[var(--warm-charcoal)]'>
							{p.gestationalAgeWeeks ? `${p.gestationalAgeWeeks}w` : "-"} /{" "}
							{p.birthWeightKg ? `${p.birthWeightKg}kg` : "-"}
						</span>
					);
				}
			},
			{
				id: "currentWeight",
				accessorFn: row => row.weightKg ?? -1,
				header: "Current Wt",
				sortFn: "basic",
				cell: ({ row }) => (
					<span className='text-xs font-semibold text-[var(--clay-black)]'>
						{row.original.weightKg ? `${row.original.weightKg} kg` : "-"}
					</span>
				)
			},
			{
				accessorKey: "allergies",
				header: "Allergies",
				sortFn: "alphanumeric",
				cell: ({ row }) =>
					row.original.allergies ? (
						<Badge variant='warning'>{row.original.allergies}</Badge>
					) : (
						<span className='text-xs text-[var(--warm-charcoal)]/50'>None</span>
					)
			},
			{
				id: "actions",
				header: () => <div className='text-end'>Actions</div>,
				enableSorting: false,
				cell: ({ row }) => {
					const p = row.original;
					return (
						<div className='flex items-center justify-end gap-2'>
							<Button
								onClick={() => void handleQuickEnqueue(p.id)}
								size='sm'
								title='Add to waiting room queue'
								type='button'
								variant='outline'
							>
								<MaterialIcon
									className='text-sm'
									name='queue'
								/>
								<span className='sr-only text-xs sm:not-sr-only sm:ml-1'>
									Queue
								</span>
							</Button>
							<Link
								params={{ patientId: p.id }}
								to='/patients/$patientId'
							>
								<Button
									className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
									size='sm'
									type='button'
								>
									Chart
								</Button>
							</Link>
						</div>
					);
				}
			}
		],
		[handleQuickEnqueue]
	);

	const table = useTable({
		features: patientTableFeatures,
		data: filteredRows,
		columns,
		state: { sorting },
		onSortingChange: setSorting
	});

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
				<div>
					<div className='flex items-center gap-2'>
						<MaterialIcon
							className='text-2xl text-[var(--matcha-600)]'
							name='groups'
						/>
						<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
							Pediatric Patient Directory
						</h1>
						<Badge variant='success'>{total} patients</Badge>
					</div>
					<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
						Search medical record numbers, pediatric demographics, and chart
						histories — Hurghada Clinic
					</p>
				</div>

				<Dialog
					onOpenChange={setIsRegisterOpen}
					open={isRegisterOpen}
				>
					<DialogTrigger>
						<Button
							className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
							type='button'
						>
							<MaterialIcon name='person_add' />
							<span>Register New Patient</span>
						</Button>
					</DialogTrigger>
					<DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto bg-[var(--pure-white)]'>
						<DialogHeader>
							<DialogTitle className='text-lg font-bold text-[var(--clay-black)]'>
								Register Pediatric Patient (تسجيل طفل جديد)
							</DialogTitle>
							<DialogDescription>
								Record initial demographic and neonatal baseline measurements.
							</DialogDescription>
						</DialogHeader>

						<form
							className='space-y-4 py-2'
							onSubmit={e => {
								e.preventDefault();
								e.stopPropagation();
								void form.handleSubmit();
							}}
						>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
								<form.Field name='mrn'>
									{field => (
										<div>
											<Label htmlFor='mrn'>MRN (رقم الملف) *</Label>
											<Input
												id='mrn'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='e.g. MRN-2026-001'
												required
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
								<form.Field name='firstName'>
									{field => (
										<div>
											<Label htmlFor='firstName'>
												First Name (الاسم الأول) *
											</Label>
											<Input
												id='firstName'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='e.g. Omar'
												required
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
								<form.Field name='lastName'>
									{field => (
										<div>
											<Label htmlFor='lastName'>
												Last Name (اسم العائلة) *
											</Label>
											<Input
												id='lastName'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='e.g. Hassan'
												required
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<form.Field name='dateOfBirth'>
									{field => (
										<div>
											<Label htmlFor='dob'>
												Date of Birth (تاريخ الميلاد) *
											</Label>
											<Input
												id='dob'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												required
												type='date'
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
								<form.Field name='sex'>
									{field => (
										<div>
											<Label htmlFor='sex'>Sex (الجنس) *</Label>
											<Select
												onValueChange={v =>
													v && field.handleChange(v as "male" | "female")
												}
												value={field.state.value}
											>
												<SelectTrigger id='sex'>
													<SelectValue placeholder='Select sex' />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='male'>Male (ذكر)</SelectItem>
													<SelectItem value='female'>Female (أنثى)</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}
								</form.Field>
							</div>

							<div className='rounded-lg border border-[var(--oat-border)] bg-[var(--warm-cream)]/40 p-3'>
								<p className='mb-2 text-xs font-bold tracking-wider text-[var(--clay-black)] uppercase'>
									Neonatal Baseline (بيانات الولادة)
								</p>
								<div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
									<form.Field name='gestationalAgeWeeks'>
										{field => (
											<div>
												<Label
													className='text-xs'
													htmlFor='ga'
												>
													GA (Weeks)
												</Label>
												<Input
													id='ga'
													max='44'
													min='20'
													name={field.name}
													onBlur={field.handleBlur}
													onChange={e => field.handleChange(e.target.value)}
													placeholder='38'
													step='0.1'
													type='number'
													value={field.state.value}
												/>
											</div>
										)}
									</form.Field>
									<form.Field name='birthWeightKg'>
										{field => (
											<div>
												<Label
													className='text-xs'
													htmlFor='bw'
												>
													Birth Wt (kg)
												</Label>
												<Input
													id='bw'
													max='10'
													min='0.3'
													name={field.name}
													onBlur={field.handleBlur}
													onChange={e => field.handleChange(e.target.value)}
													placeholder='3.2'
													step='0.01'
													type='number'
													value={field.state.value}
												/>
											</div>
										)}
									</form.Field>
									<form.Field name='birthLengthCm'>
										{field => (
											<div>
												<Label
													className='text-xs'
													htmlFor='bl'
												>
													Length (cm)
												</Label>
												<Input
													id='bl'
													max='70'
													min='20'
													name={field.name}
													onBlur={field.handleBlur}
													onChange={e => field.handleChange(e.target.value)}
													placeholder='50'
													step='0.1'
													type='number'
													value={field.state.value}
												/>
											</div>
										)}
									</form.Field>
									<form.Field name='birthHeadCircumferenceCm'>
										{field => (
											<div>
												<Label
													className='text-xs'
													htmlFor='bhc'
												>
													Head Circ (cm)
												</Label>
												<Input
													id='bhc'
													max='50'
													min='15'
													name={field.name}
													onBlur={field.handleBlur}
													onChange={e => field.handleChange(e.target.value)}
													placeholder='34.5'
													step='0.1'
													type='number'
													value={field.state.value}
												/>
											</div>
										)}
									</form.Field>
								</div>
							</div>

							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<form.Field name='parentName'>
									{field => (
										<div>
											<Label htmlFor='parentName'>
												Guardian Name (ولي الأمر)
											</Label>
											<Input
												id='parentName'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='Mother or Father name'
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
								<form.Field name='parentPhone'>
									{field => (
										<div>
											<Label htmlFor='parentPhone'>
												Guardian Phone (رقم التواصل)
											</Label>
											<Input
												id='parentPhone'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='010xxxxxxxx'
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<form.Field name='weightKg'>
									{field => (
										<div>
											<Label htmlFor='currentWeight'>
												Current Weight (الوزن الحالي كجم)
											</Label>
											<Input
												id='currentWeight'
												max='150'
												min='0.3'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='e.g. 5.4'
												step='0.01'
												type='number'
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
								<form.Field name='allergies'>
									{field => (
										<div>
											<Label htmlFor='allergies'>
												Allergies (الحساسية الدوائية والغذائية)
											</Label>
											<Input
												id='allergies'
												name={field.name}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												placeholder='e.g. Penicillin, Egg allergy, NKDA'
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<form.Field name='notes'>
								{field => (
									<div>
										<Label htmlFor='notes'>Clinical Notes / History</Label>
										<Textarea
											id='notes'
											name={field.name}
											onBlur={field.handleBlur}
											onChange={e => field.handleChange(e.target.value)}
											placeholder='Feeding history, birth/lactation notes, or chronic conditions...'
											rows={2}
											value={field.state.value}
										/>
									</div>
								)}
							</form.Field>

							<DialogFooter className='pt-2'>
								<Button
									disabled={isCreating}
									onClick={() => setIsRegisterOpen(false)}
									type='button'
									variant='outline'
								>
									Cancel
								</Button>
								<form.Subscribe selector={s => [s.canSubmit, s.isSubmitting]}>
									{([canSubmit, isSubmitting]) => (
										<Button
											className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
											disabled={!canSubmit || isSubmitting || isCreating}
											type='submit'
										>
											{isCreating || isSubmitting
												? "Saving..."
												: "Save Patient"}
										</Button>
									)}
								</form.Subscribe>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Search & Sex Filter */}
			<div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
				<div className='relative flex-1'>
					<MaterialIcon
						className='absolute top-1/2 left-3 -translate-y-1/2 text-[var(--warm-charcoal)]/60'
						name='search'
					/>
					<Input
						className='bg-[var(--pure-white)] pl-10'
						onChange={e => setSearchQuery(e.target.value)}
						placeholder='Search by child name, MRN, parent phone...'
						value={searchQuery}
					/>
				</div>
				<Select
					onValueChange={v => v && setSexFilter(v as "all" | "male" | "female")}
					value={sexFilter}
				>
					<SelectTrigger className='w-full bg-[var(--pure-white)] sm:w-44'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Sexes</SelectItem>
						<SelectItem value='male'>Male (ذكر)</SelectItem>
						<SelectItem value='female'>Female (أنثى)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Patients List Table (TanStack Table v9) */}
			<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-3 p-6'>
							<Skeleton className='h-12 w-full' />
							<Skeleton className='h-12 w-full' />
							<Skeleton className='h-12 w-full' />
						</div>
					) : table.getRowModel().rows.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<MaterialIcon name='person_search' />
								</EmptyMedia>
								<EmptyTitle level={2}>No patients found</EmptyTitle>
								<EmptyDescription>
									Try adjusting your search query or register a new patient
									chart.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map(headerGroup => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map(header => (
											<TableHead key={header.id}>
												{header.isPlaceholder ? null : header.column.getCanSort() ? (
													<button
														className='inline-flex cursor-pointer items-center gap-1 font-semibold hover:text-[var(--clay-black)]'
														onClick={header.column.getToggleSortingHandler()}
														type='button'
													>
														<table.FlexRender header={header} />
														<MaterialIcon
															className='text-xs'
															name={
																header.column.getIsSorted() === "asc"
																	? "arrow_upward"
																	: header.column.getIsSorted() === "desc"
																		? "arrow_downward"
																		: "unfold_more"
															}
														/>
													</button>
												) : (
													<table.FlexRender header={header} />
												)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.map(row => (
									<TableRow key={row.id}>
										{row.getAllCells().map(cell => (
											<TableCell key={cell.id}>
												<table.FlexRender cell={cell} />
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
