import { specialistRequestSchema, type SpecialistRequest } from '@/models/agent';

export function createSpecialistRequest(input: SpecialistRequest) {
  return specialistRequestSchema.parse(input);
}

// Live model orchestration will be added only after credentials and tool contracts are agreed.
