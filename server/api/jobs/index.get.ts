// Returns a list of fuji jobs to the background worker
export default defineEventHandler(async (_event) => {
  const jobs = await prisma.fujiJob.findMany({ take: 10 });

  return jobs || [];
});
