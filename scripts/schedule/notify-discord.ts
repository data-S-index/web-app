const COLOR_SUCCESS = 0x2ecc71;
const COLOR_WARNING = 0xf1c40f;
const COLOR_FAILURE = 0xe74c3c;

const MAX_FAILED_IDS = 20;

function runUrl(): string | undefined {
  const { GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL } = process.env;
  if (!GITHUB_REPOSITORY || !GITHUB_RUN_ID) return undefined;

  return `${GITHUB_SERVER_URL ?? "https://github.com"}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

async function postEmbed(embed: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          { ...embed, url: runUrl(), timestamp: new Date().toISOString() },
        ],
      }),
    });

    if (!res.ok) {
      console.error(
        `Discord webhook returned ${res.status}: ${await res.text()}`,
      );
    }
  } catch (error) {
    console.error("Failed to post to Discord:", error);
  }
}

export async function notifyRunResult(
  jobName: string,
  result: {
    total: number;
    processed: number;
    failed: number;
    elapsedSeconds: number;
    failedIds?: number[];
    extraFields?: Record<string, number>;
  },
): Promise<void> {
  const {
    total,
    processed,
    failed,
    elapsedSeconds,
    failedIds = [],
    extraFields = {},
  } = result;

  const fields = [
    { name: "Queued", value: total.toLocaleString(), inline: true },
    { name: "Processed", value: processed.toLocaleString(), inline: true },
    { name: "Failed", value: failed.toLocaleString(), inline: true },
    { name: "Duration", value: `${elapsedSeconds.toFixed(1)}s`, inline: true },
    ...Object.entries(extraFields).map(([name, value]) => ({
      name,
      value: value.toLocaleString(),
      inline: true,
    })),
  ];

  if (failedIds.length > 0) {
    const shown = failedIds.slice(0, MAX_FAILED_IDS).join(", ");
    const more =
      failedIds.length > MAX_FAILED_IDS
        ? ` (+${failedIds.length - MAX_FAILED_IDS} more)`
        : "";
    fields.push({ name: "Failed IDs", value: shown + more, inline: false });
  }

  await postEmbed({
    title: `${failed > 0 ? "⚠️" : ""} ${jobName} finished`,
    description: total === 0 ? "No jobs to process." : "Run completed.",
    color: failed > 0 ? COLOR_WARNING : COLOR_SUCCESS,
    fields: total === 0 ? [] : fields,
  });
}

export async function notifyRunSummary(
  jobName: string,
  description: string,
  fields: Record<string, string | number> = {},
): Promise<void> {
  await postEmbed({
    title: `${jobName} finished`,
    description,
    color: COLOR_SUCCESS,
    fields: Object.entries(fields).map(([name, value]) => ({
      name,
      value: typeof value === "number" ? value.toLocaleString() : value,
      inline: true,
    })),
  });
}

export async function notifyRunFailure(
  jobName: string,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);

  await postEmbed({
    title: `${jobName} failed`,
    description: `\`\`\`\n${message.slice(0, 3900)}\n\`\`\``,
    color: COLOR_FAILURE,
  });
}
