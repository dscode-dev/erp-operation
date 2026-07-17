import { DocumentTemplateType, Role } from '@prisma/client';
import { DocumentAssetResolver } from '../../src/modules/document-engine/assets/document-asset-resolver.service';
import { DocumentHandoffService } from '../../src/modules/document-engine/document-handoff.service';
import {
  ControlledStorage,
  createActor,
  createOperation,
  createOrganization,
  disconnectDatabase,
  prisma,
  resetDatabase,
} from './helpers';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);
const audit = { requestId: 'handoff-integration', ip: '127.0.0.1', userAgent: 'jest' };

describe('Field Report Handoff', () => {
  const storage = new ControlledStorage();
  const service = new DocumentHandoffService(
    prisma as never,
    new DocumentAssetResolver(storage),
  );

  beforeEach(async () => {
    await resetDatabase();
    storage.files.clear();
    storage.saves.length = 0;
  });

  afterAll(disconnectDatabase);

  it('persists Operator collection, management review, signature snapshots and immutable history', async () => {
    const organization = await createOrganization();
    const owner = await createActor(Role.OWNER, 'handoff-owner');
    const operator = await createActor(Role.OPERATOR, 'handoff-operator');
    const operation = await createOperation(operator);
    await prisma.assignment.create({
      data: {
        operationId: operation.id,
        assignedBy: owner.id,
        assignedTo: operator.id,
      },
    });
    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        reportedIssue: 'Falha de refrigeração informada em campo',
        signatureData: `data:image/png;base64,${PNG.toString('base64')}`,
        customerSignerName: 'Responsável local',
        signedAt: new Date('2026-07-17T12:00:00.000Z'),
        inspectedEquipments: {
          create: { equipmentId: operation.equipmentId, position: 0, sector: 'Sala técnica' },
        },
      },
    });
    const sourceKey = 'documents/signatures/integration-source.png';
    storage.files.set(sourceKey, PNG);
    const signature = await prisma.signature.create({
      data: {
        organizationId: organization.id,
        name: 'Engenheira Responsável',
        title: 'Responsável Técnica',
        profession: 'Engenheira Mecânica',
        professionalCouncil: 'CREA-PE',
        registrationNumber: '123456',
        department: 'Engenharia',
        imageStorageKey: sourceKey,
        mimeType: 'image/png',
        originalFileName: 'assinatura.png',
        fileSize: PNG.length,
        active: true,
        isDefault: true,
      },
    });

    const draft = await service.saveDraft(
      { operationId: operation.id, type: DocumentTemplateType.WORK_ORDER },
      operator,
      audit,
    ) as { id: string; editorialStatus: string; technicalSignature: { id: string } };
    expect(draft.editorialStatus).toBe('DRAFT');
    expect(draft.technicalSignature.id).toBe(signature.id);

    const submitted = await service.submit(draft.id, operator, audit) as {
      editorialStatus: string;
      customerSignature: { name: string; origin: string };
    };
    expect(submitted.editorialStatus).toBe('DRAFT');
    expect(submitted.customerSignature).toMatchObject({ name: 'Responsável local', origin: 'OPERATOR' });

    await service.startReview(draft.id, owner, audit);
    const finalized = await service.finalize(draft.id, owner, audit) as {
      editorialStatus: string;
      finalizedBy: { id: string };
    };
    expect(finalized.editorialStatus).toBe('READY');
    expect(finalized.finalizedBy.id).toBe(owner.id);

    const persisted = await prisma.operationDocument.findUniqueOrThrow({ where: { id: draft.id } });
    expect(persisted.technicalSignatureSnapshot).toMatchObject({ name: 'Engenheira Responsável', registrationNumber: '123456' });
    expect(persisted.customerSignatureSnapshot).toMatchObject({ name: 'Responsável local', origin: 'OPERATOR' });
    expect(await prisma.documentRevision.count({ where: { documentId: draft.id } })).toBeGreaterThanOrEqual(4);
    expect(storage.saves).toHaveLength(2);
  });

  it('enforces Assignment authorization, document matrix and management-only finalization', async () => {
    await createOrganization();
    const owner = await createActor(Role.OWNER, 'matrix-owner');
    const operator = await createActor(Role.OPERATOR, 'matrix-operator');
    const otherOperator = await createActor(Role.OPERATOR, 'matrix-other');
    const operation = await createOperation(operator);
    await prisma.assignment.create({ data: { operationId: operation.id, assignedBy: owner.id, assignedTo: operator.id } });

    await expect(service.saveDraft({ operationId: operation.id, type: DocumentTemplateType.WORK_ORDER }, otherOperator, audit)).rejects.toMatchObject({ status: 403 });
    await expect(service.saveDraft({ operationId: operation.id, type: DocumentTemplateType.RECEIPT }, operator, audit)).rejects.toMatchObject({ status: 403 });

    const opinion = await service.saveDraft({ operationId: operation.id, type: DocumentTemplateType.TECHNICAL_OPINION }, operator, audit) as { id: string };
    await expect(service.submit(opinion.id, operator, audit)).resolves.toMatchObject({ editorialStatus: 'DRAFT', customerSignature: null });
    await expect(service.finalize(opinion.id, operator, audit)).rejects.toMatchObject({ status: 403 });
    await service.startReview(opinion.id, owner, audit);
    await expect(service.finalize(opinion.id, owner, audit)).rejects.toMatchObject({ status: 409 });
  });
});
