export default defineEventHandler(async () => {
  const userCount = await prisma.user.count();

  return {
    userCount,
  };
});
