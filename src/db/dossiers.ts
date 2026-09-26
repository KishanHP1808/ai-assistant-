import { db } from './index.ts';
import { researchDossiers, trainingEvents } from './schema.ts';
import { desc, eq } from 'drizzle-orm';

export async function saveDossierToCloudSQL(record: {
  topic: string;
  report: string;
  sources: any[];
  userId?: string;
  departmentCode?: string;
  departmentName?: string;
  trainedEpoch?: number;
  createdAt?: string;
}) {
  try {
    const inserted = await db
      .insert(researchDossiers)
      .values({
        topic: record.topic,
        report: record.report,
        sources: JSON.stringify(record.sources || []),
        userId: record.userId || null,
        departmentCode: record.departmentCode || null,
        departmentName: record.departmentName || null,
        trainedEpoch: record.trainedEpoch || 1,
        createdAt: record.createdAt || new Date().toISOString(),
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error("Cloud SQL saveDossier error:", error);
    return null;
  }
}

export async function getCloudSQLDossiers(limit = 20) {
  try {
    const rows = await db
      .select()
      .from(researchDossiers)
      .orderBy(desc(researchDossiers.timestamp))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      report: r.report,
      sources: JSON.parse(r.sources || "[]"),
      department_code: r.departmentCode,
      department_name: r.departmentName,
      trained_epoch: r.trainedEpoch,
      created_at: r.createdAt,
      timestamp: r.timestamp,
    }));
  } catch (error) {
    console.error("Cloud SQL getDossiers error:", error);
    return [];
  }
}

export async function getCloudSQLDossierById(id: number) {
  try {
    const rows = await db
      .select()
      .from(researchDossiers)
      .where(eq(researchDossiers.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      topic: r.topic,
      report: r.report,
      sources: JSON.parse(r.sources || "[]"),
      department_code: r.departmentCode,
      department_name: r.departmentName,
      trained_epoch: r.trainedEpoch,
      created_at: r.createdAt,
      timestamp: r.timestamp,
    };
  } catch (error) {
    console.error("Cloud SQL getDossierById error:", error);
    return null;
  }
}

export async function saveTrainingEventToCloudSQL(event: {
  type: string;
  title: string;
  epoch: number;
  details?: string;
}) {
  try {
    const inserted = await db
      .insert(trainingEvents)
      .values({
        type: event.type,
        title: event.title,
        epoch: event.epoch,
        details: event.details || null,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error("Cloud SQL saveTrainingEvent error:", error);
    return null;
  }
}
