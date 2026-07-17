import { PrismaClient } from '@prisma/client';
import { KNOWLEDGE_BASE } from '../src/modules/ai/rag/knowledge.data';

/**
 * 数据库种子脚本：写入内置命理知识库到 knowledge_chunks。
 * RAG 当前使用内置内存语料，这里同步落库以便后续切换到 DB / 向量检索。
 */
const prisma = new PrismaClient();

async function main() {
  console.log('开始写入命理知识库种子数据...');
  for (const chunk of KNOWLEDGE_BASE) {
    await prisma.knowledgeChunk.upsert({
      where: { id: chunk.id },
      update: { topic: chunk.topic, tags: chunk.tags, content: chunk.content },
      create: {
        id: chunk.id,
        topic: chunk.topic,
        tags: chunk.tags,
        content: chunk.content,
      },
    });
  }
  console.log(`已写入 ${KNOWLEDGE_BASE.length} 条知识片段。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
