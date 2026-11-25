import * as adminSchema from './admin';
import * as authSchema from './auth';
import * as clinicSchema from './clinic';
import * as financeSchema from './finance';
import * as growthSchema from './growth';
import * as prescriptionsSchema from './prescriptions';

export * from './admin';

export * from './auth';

export * from './clinic';

export * from './columns';

export * from './enums';

export * from './finance';

export * from './growth';

export * from './prescriptions';

export const schema = {
  ...adminSchema,
  ...authSchema,
  ...clinicSchema,
  ...financeSchema,
  ...growthSchema,
  ...prescriptionsSchema,
};
