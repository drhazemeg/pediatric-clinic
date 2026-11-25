import type { ExtractTablesFromSchema, RelationsBuilder } from 'drizzle-orm';

import { defineRelations } from 'drizzle-orm';

import * as schema from './schema';

export const relations = defineRelations(
  schema,
  (r: RelationsBuilder<ExtractTablesFromSchema<typeof schema>>) => ({
    user: {
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      credit: r.one.userCredit({
        from: r.user.id,
        to: r.userCredit.userId,
      }),
      creditTransactions: r.many.creditTransaction({
        from: r.user.id,
        to: r.creditTransaction.userId,
      }),
      adminAuditLogsAsAdmin: r.many.adminAuditLog({
        from: r.user.id,
        to: r.adminAuditLog.adminUserId,
        alias: 'adminAuditLog_adminUser',
      }),
      adminAuditLogsAsTarget: r.many.adminAuditLog({
        from: r.user.id,
        to: r.adminAuditLog.targetUserId,
        alias: 'adminAuditLog_targetUser',
      }),
      linkedPatients: r.many.patients({
        from: r.user.id.through(r.guardianLinks.userId),
        to: r.patients.id.through(r.guardianLinks.patientId),
      }),
      providerPatients: r.many.patients({
        from: r.user.id,
        to: r.patients.providerId,
        alias: 'provider_patients',
      }),
      appointments: r.many.appointments({
        from: r.user.id,
        to: r.appointments.doctorId,
      }),
      visits: r.many.visits({
        from: r.user.id,
        to: r.visits.doctorId,
      }),
      prescriptions: r.many.prescriptions({
        from: r.user.id,
        to: r.prescriptions.prescribedById,
      }),
    },

    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
        optional: false,
      }),
    },

    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
        optional: false,
      }),
    },

    userCredit: {
      user: r.one.user({
        from: r.userCredit.userId,
        to: r.user.id,
        optional: false,
      }),
    },

    creditTransaction: {
      user: r.one.user({
        from: r.creditTransaction.userId,
        to: r.user.id,
        optional: false,
      }),
    },

    adminAuditLog: {
      admin: r.one.user({
        from: r.adminAuditLog.adminUserId,
        to: r.user.id,
        alias: 'adminAuditLog_adminUser',
        optional: false,
      }),
      target: r.one.user({
        from: r.adminAuditLog.targetUserId,
        to: r.user.id,
        alias: 'adminAuditLog_targetUser',
      }),
    },

    clinics: {
      users: r.many.user({
        from: r.clinics.id,
        to: r.user.clinicId,
      }),
      patients: r.many.patients({
        from: r.clinics.id,
        to: r.patients.clinicId,
      }),
      appointments: r.many.appointments({
        from: r.clinics.id,
        to: r.appointments.clinicId,
      }),
      visits: r.many.visits({
        from: r.clinics.id,
        to: r.visits.clinicId,
      }),
      ledgerEntries: r.many.clinicLedgerEntries({
        from: r.clinics.id,
        to: r.clinicLedgerEntries.clinicId,
      }),
      queueEntries: r.many.clinicQueue({
        from: r.clinics.id,
        to: r.clinicQueue.clinicId,
      }),
    },

    patients: {
      clinic: r.one.clinics({
        from: r.patients.clinicId,
        to: r.clinics.id,
      }),
      provider: r.one.user({
        from: r.patients.providerId,
        to: r.user.id,
        alias: 'provider_patients',
      }),
      guardians: r.many.user({
        from: r.patients.id.through(r.guardianLinks.patientId),
        to: r.user.id.through(r.guardianLinks.userId),
      }),
      appointments: r.many.appointments({
        from: r.patients.id,
        to: r.appointments.patientId,
      }),
      visits: r.many.visits({
        from: r.patients.id,
        to: r.visits.patientId,
      }),
      medicalNotes: r.many.medicalNotes({
        from: r.patients.id,
        to: r.medicalNotes.patientId,
      }),
      immunizations: r.many.immunizations({
        from: r.patients.id,
        to: r.immunizations.patientId,
      }),
      certificates: r.many.certificates({
        from: r.patients.id,
        to: r.certificates.patientId,
      }),
      prescriptions: r.many.prescriptions({
        from: r.patients.id,
        to: r.prescriptions.patientId,
      }),
      measurements: r.many.measurements({
        from: r.patients.id,
        to: r.measurements.patientId,
      }),
      milestones: r.many.milestones({
        from: r.patients.id,
        to: r.milestones.patientId,
      }),
      queueEntries: r.many.clinicQueue({
        from: r.patients.id,
        to: r.clinicQueue.patientId,
      }),
    },

    guardianLinks: {
      user: r.one.user({
        from: r.guardianLinks.userId,
        to: r.user.id,
        optional: false,
      }),
      patient: r.one.patients({
        from: r.guardianLinks.patientId,
        to: r.patients.id,
        optional: false,
      }),
    },

    appointments: {
      patient: r.one.patients({
        from: r.appointments.patientId,
        to: r.patients.id,
        optional: false,
      }),
      clinic: r.one.clinics({
        from: r.appointments.clinicId,
        to: r.clinics.id,
        optional: false,
      }),
      doctor: r.one.user({
        from: r.appointments.doctorId,
        to: r.user.id,
      }),
      visits: r.many.visits({
        from: r.appointments.id,
        to: r.visits.appointmentId,
      }),
    },

    visits: {
      patient: r.one.patients({
        from: r.visits.patientId,
        to: r.patients.id,
        optional: false,
      }),
      clinic: r.one.clinics({
        from: r.visits.clinicId,
        to: r.clinics.id,
        optional: false,
      }),
      appointment: r.one.appointments({
        from: r.visits.appointmentId,
        to: r.appointments.id,
      }),
      doctor: r.one.user({
        from: r.visits.doctorId,
        to: r.user.id,
      }),
      diagnoses: r.many.diagnoses({
        from: r.visits.id,
        to: r.diagnoses.visitId,
      }),
      medicalNotes: r.many.medicalNotes({
        from: r.visits.id,
        to: r.medicalNotes.visitId,
      }),
      immunizations: r.many.immunizations({
        from: r.visits.id,
        to: r.immunizations.visitId,
      }),
      prescriptions: r.many.prescriptions({
        from: r.visits.id,
        to: r.prescriptions.visitId,
      }),
      measurements: r.many.measurements({
        from: r.visits.id,
        to: r.measurements.visitId,
      }),
    },

    medicalNotes: {
      patient: r.one.patients({
        from: r.medicalNotes.patientId,
        to: r.patients.id,
        optional: false,
      }),
      visit: r.one.visits({
        from: r.medicalNotes.visitId,
        to: r.visits.id,
      }),
      author: r.one.user({
        from: r.medicalNotes.authorId,
        to: r.user.id,
      }),
    },

    diagnoses: {
      visit: r.one.visits({
        from: r.diagnoses.visitId,
        to: r.visits.id,
        optional: false,
      }),
    },

    vaccineCatalog: {
      immunizations: r.many.immunizations({
        from: r.vaccineCatalog.id,
        to: r.immunizations.vaccineId,
      }),
    },

    certificates: {
      patient: r.one.patients({
        from: r.certificates.patientId,
        to: r.patients.id,
        optional: false,
      }),
    },

    immunizations: {
      patient: r.one.patients({
        from: r.immunizations.patientId,
        to: r.patients.id,
        optional: false,
      }),
      visit: r.one.visits({
        from: r.immunizations.visitId,
        to: r.visits.id,
      }),
      vaccine: r.one.vaccineCatalog({
        from: r.immunizations.vaccineId,
        to: r.vaccineCatalog.id,
      }),
      administeredBy: r.one.user({
        from: r.immunizations.administeredById,
        to: r.user.id,
      }),
    },

    prescriptions: {
      visit: r.one.visits({
        from: r.prescriptions.visitId,
        to: r.visits.id,
        optional: false,
      }),
      patient: r.one.patients({
        from: r.prescriptions.patientId,
        to: r.patients.id,
        optional: false,
      }),
      prescribedBy: r.one.user({
        from: r.prescriptions.prescribedById,
        to: r.user.id,
      }),
    },

    measurements: {
      visit: r.one.visits({
        from: r.measurements.visitId,
        to: r.visits.id,
        optional: false,
      }),
      patient: r.one.patients({
        from: r.measurements.patientId,
        to: r.patients.id,
        optional: false,
      }),
    },

    milestoneCatalog: {
      milestones: r.many.milestones({
        from: r.milestoneCatalog.id,
        to: r.milestones.milestoneId,
      }),
    },

    milestones: {
      patient: r.one.patients({
        from: r.milestones.patientId,
        to: r.patients.id,
        optional: false,
      }),
      milestone: r.one.milestoneCatalog({
        from: r.milestones.milestoneId,
        to: r.milestoneCatalog.id,
        optional: false,
      }),
    },

    clinicLedgerEntries: {
      clinic: r.one.clinics({
        from: r.clinicLedgerEntries.clinicId,
        to: r.clinics.id,
        optional: false,
      }),
    },

    clinicQueue: {
      clinic: r.one.clinics({
        from: r.clinicQueue.clinicId,
        to: r.clinics.id,
        optional: false,
      }),
      patient: r.one.patients({
        from: r.clinicQueue.patientId,
        to: r.patients.id,
        optional: false,
      }),
      appointment: r.one.appointments({
        from: r.clinicQueue.appointmentId,
        to: r.appointments.id,
      }),
      doctor: r.one.user({
        from: r.clinicQueue.doctorId,
        to: r.user.id,
      }),
    },
  }),
);
