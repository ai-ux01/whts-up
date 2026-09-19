import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- WORKSPACES ---');
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      metaPageId: true,
      metaConnectedAt: true,
    }
  });
  console.log(JSON.stringify(workspaces, null, 2));

  console.log('\n--- SOCIAL ACCOUNTS ---');
  // Since hasToken is not a column, we select accessToken instead and check if it is not null
  const accountsWithTokenCheck = await prisma.socialAccount.findMany({
    select: {
      id: true,
      workspaceId: true,
      platform: true,
      accountId: true,
      accountName: true,
      accessToken: true,
    }
  });
  console.log(
    accountsWithTokenCheck.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      platform: a.platform,
      accountId: a.accountId,
      accountName: a.accountName,
      hasToken: !!a.accessToken,
    }))
  );

  console.log('\n--- LATEST SOCIAL POSTS (INCLUDING ERRORS) ---');
  const posts = await prisma.socialPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      workspaceId: true,
      status: true,
      error: true,
      platforms: true,
      scheduledAt: true,
      postId: true,
      caption: true,
    }
  });
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
