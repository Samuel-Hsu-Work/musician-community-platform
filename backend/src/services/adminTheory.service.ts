import prisma from '../config/database';
import { THEORY_TOPIC_CATALOG } from '../data/theoryTopicCatalog';
import {
  DEFAULT_TOPIC_PAGE_SIZE,
  buildPaginationMeta,
} from '../utils/forumPagination';

const VALID_DOMAIN_IDS = new Set(
  THEORY_TOPIC_CATALOG.map((entry) => entry.domainId)
);

export class AdminTheoryService {
  async listTopics(options: {
    domainId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const search = options.search?.trim().toLowerCase();

    let catalog = [...THEORY_TOPIC_CATALOG];

    if (options.domainId) {
      if (!VALID_DOMAIN_IDS.has(options.domainId)) {
        throw new Error('Invalid domainId');
      }
      catalog = catalog.filter((entry) => entry.domainId === options.domainId);
    }

    if (search) {
      catalog = catalog.filter(
        (entry) =>
          entry.id.toLowerCase().includes(search) ||
          entry.name.toLowerCase().includes(search) ||
          entry.category.toLowerCase().includes(search)
      );
    }

    const total = catalog.length;
    const skip = (page - 1) * limit;
    const pageEntries = catalog.slice(skip, skip + limit);
    const ids = pageEntries.map((entry) => entry.id);

    const definitions = await prisma.notationDefinition.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        category: true,
        standardDefinition: true,
        updatedAt: true,
      },
    });

    const definitionById = new Map(definitions.map((row) => [row.id, row]));

    return {
      topics: pageEntries.map((entry) => {
        const definition = definitionById.get(entry.id);
        return {
          id: entry.id,
          catalogName: entry.name,
          name: definition?.name ?? entry.name,
          category: definition?.category ?? entry.category,
          domainId: entry.domainId,
          kind: entry.kind,
          hasDefinition: Boolean(definition),
          standardDefinitionPreview: definition?.standardDefinition
            ? definition.standardDefinition.slice(0, 160)
            : null,
          updatedAt: definition?.updatedAt ?? null,
        };
      }),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getTopic(topicId: string) {
    const catalogEntry = THEORY_TOPIC_CATALOG.find((entry) => entry.id === topicId);
    if (!catalogEntry) {
      throw new Error('Topic not found');
    }

    const definition = await prisma.notationDefinition.findUnique({
      where: { id: topicId },
    });

    return {
      catalog: catalogEntry,
      definition: definition
        ? {
            id: definition.id,
            name: definition.name,
            category: definition.category,
            standardDefinition: definition.standardDefinition,
            updatedAt: definition.updatedAt,
          }
        : null,
    };
  }

  async updateTopic(
    topicId: string,
    data: {
      name?: string;
      category?: string;
      standardDefinition?: string;
    }
  ) {
    const catalogEntry = THEORY_TOPIC_CATALOG.find((entry) => entry.id === topicId);
    if (!catalogEntry) {
      throw new Error('Topic not found');
    }

    const name = data.name?.trim() || catalogEntry.name;
    const category = data.category?.trim() || catalogEntry.category;

    if (!data.standardDefinition?.trim()) {
      throw new Error('standardDefinition is required');
    }

    const updated = await prisma.notationDefinition.upsert({
      where: { id: topicId },
      create: {
        id: topicId,
        name,
        category,
        standardDefinition: data.standardDefinition.trim(),
      },
      update: {
        name,
        category,
        standardDefinition: data.standardDefinition.trim(),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      standardDefinition: updated.standardDefinition,
      updatedAt: updated.updatedAt,
    };
  }
}

export const adminTheoryService = new AdminTheoryService();
