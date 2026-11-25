const prefixes = {
  allergy: 'ALG',
  appointment: 'APT',
  audit: 'AUD',
  charge: 'CHG',
  clinic: 'CLN',
  cnote: 'CNO',
  condition: 'CON',
  doctor: 'DOC',
  encounter: 'ENC',
  expense: 'EXP',
  growth: 'GRP',
  guardian: 'GRD',
  immunization: 'IMM',
  invitem: 'INVI',
  invoice: 'INV',
  lab: 'LAB',
  lab_order: 'LBO',
  patient: 'PAT',
  payment: 'PAY',
  prescription: 'PRC',
  record: 'REC',
  rx: 'RX',
  staff: 'STF',
  template: 'TMP',
  user: 'USR',
  vital: 'VIT',
  who: 'WHO',
  queue: 'QQ',
} as const;

type Prefix = keyof typeof prefixes;

interface GenerateIdOptions {
  separator?: string;
}

export function createId(
  prefixOrOptions?: Prefix | GenerateIdOptions,
  inputOptions: GenerateIdOptions = {},
): string {
  const isOptions = prefixOrOptions instanceof Object;

  const finalOptions = isOptions ? prefixOrOptions : inputOptions;
  const prefix = isOptions ? undefined : prefixOrOptions;
  const { separator = '_' } = finalOptions;
  const id = crypto.randomUUID();

  return prefix ? `${prefixes[prefix]}${separator}${id}` : id;
}
