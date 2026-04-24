const {
  classifyRetentionCandidates,
  computeRetentionDeadlines,
} = require('../../../src/workers/subscription-maintenance.worker');

describe('Subscription proof retention lifecycle', () => {
  it('computes retention deadlines at 30 days for files and 180 days for metadata', () => {
    const submittedAt = new Date('2026-04-01T00:00:00.000Z');

    const deadlines = computeRetentionDeadlines({
      submittedAt,
      uploadedAt: submittedAt,
    });

    expect(deadlines.proofFileDeleteAt.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(deadlines.metadataExpireAt.toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('classifies expired files and metadata independently', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');

    const classification = classifyRetentionCandidates(
      [
        {
          id: 'req-1',
          status: 'approved',
          proofFile: {
            storageUrl: 'https://example.com/proof.png',
            deleteAt: new Date('2026-05-01T00:00:00.000Z'),
          },
          metadataExpireAt: new Date('2026-09-28T00:00:00.000Z'),
        },
      ],
      now
    );

    expect(classification.proofFilePurgeIds).toEqual(['req-1']);
    expect(classification.metadataPurgeIds).toEqual([]);
  });
});
